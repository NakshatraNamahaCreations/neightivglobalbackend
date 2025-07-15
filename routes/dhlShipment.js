const express = require('express');
const axios = require('axios');
const router = express.Router();
const numberToWords = require('number-to-words');
const xml2js = require('xml2js');
const currency = require('currency.js');
const DhlOrder = require('../models/DhlOrder'); 
const pdfParse = require('pdf-parse'); 

const validCountryCodes = [
  'US', 'CN', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'MX','IN', 'AE',
];


const currencyUnits = {
  USD: { whole: 'Dollar', fractional: 'Cent', pluralWhole: 'Dollars', pluralFractional: 'Cents' },
  GBP: { whole: 'Pound', fractional: 'Pence', pluralWhole: 'Pounds', pluralFractional: 'Pence' },
  EUR: { whole: 'Euro', fractional: 'Cent', pluralWhole: 'Euros', pluralFractional: 'Cents' },
  JPY: { whole: 'Yen', fractional: null, pluralWhole: 'Yen', pluralFractional: null }, // JPY has no fractional unit
  CAD: { whole: 'Dollar', fractional: 'Cent', pluralWhole: 'Dollars', pluralFractional: 'Cents' },
  AUD: { whole: 'Dollar', fractional: 'Cent', pluralWhole: 'Dollars', pluralFractional: 'Cents' },
  CNY: { whole: 'Yuan', fractional: 'Fen', pluralWhole: 'Yuan', pluralFractional: 'Fen' },
  BRL: { whole: 'Real', fractional: 'Centavo', pluralWhole: 'Reais', pluralFractional: 'Centavos' },
  MXN: { whole: 'Peso', fractional: 'Centavo', pluralWhole: 'Pesos', pluralFractional: 'Centavos' },
  // Add more currencies as needed
};

const convertAmountToWords = (amount, currency) => {
  // Default to USD if currency is not supported
  const units = currencyUnits[currency.toUpperCase()] || currencyUnits.USD;
  const [wholeNumber, decimal] = amount.toString().split('.');

  // Convert whole number to words and format
  const wholeNum = parseInt(wholeNumber, 10);
  let wholeNumberInWords = numberToWords.toWords(wholeNum).replace(/ and/g, ', and');
  wholeNumberInWords = wholeNumberInWords.charAt(0).toUpperCase() + wholeNumberInWords.slice(1);
  wholeNumberInWords = `${wholeNumberInWords} ${wholeNum === 1 ? units.whole : units.pluralWhole}`;

  // Handle fractional part (if applicable)
  let fractionalInWords = '';
  if (units.fractional && decimal) {
    const fractionalNum = parseInt(decimal.padEnd(2, '0'), 10); // Ensure 2 digits for cents/pence
    fractionalInWords = ` and ${numberToWords.toWords(fractionalNum)} ${
      fractionalNum === 1 ? units.fractional : units.pluralFractional
    }`;
  }

  return `${wholeNumberInWords}${fractionalInWords} only (${currency.toUpperCase()})`;
};




const getCurrentDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); 
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


const parseSoapResponse = async (xml) => {
  try {
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });

    const result = await parser.parseStringPromise(xml);
    console.log('🚚 Parsed SOAP Result (level 1):', JSON.stringify(result, null, 2));

    const nestedXml = result?.Envelope?.Body?.PostQuote_RASResponse?.PostQuote_RASResult;

    if (!nestedXml) {
      throw new Error('No PostQuote_RASResult found in SOAP response.');
    }

    // Parse nested XML string
    const nestedResult = await parser.parseStringPromise(nestedXml);
    console.log('📦 Parsed SOAP Result (nested level):', JSON.stringify(nestedResult, null, 2));

    if (nestedResult.ConditionData) {
      throw new Error(nestedResult.ConditionData);
    }

    const shippingCharge = nestedResult?.Details?.ShippingCharge || '0.00';
    const totalTaxAmount = nestedResult?.Details?.TotalTaxAmount || '0.00';
    const totalCharge = (parseFloat(shippingCharge) + parseFloat(totalTaxAmount)).toFixed(2);

    return totalCharge;
  } catch (error) {
    console.error('❌ Error parsing DHL SOAP response:', error.message);
    throw new Error(`Failed to parse SOAP response: ${error.message}`);
  }
};


const validateCountryCode = (countryCode) => {
  if (!countryCode || countryCode.length !== 2 || !validCountryCodes.includes(countryCode.toUpperCase())) {
    throw new Error('Invalid country code. Please provide a valid two-letter ISO country code (e.g., US, CN).');
  }
  return countryCode.toUpperCase();
};


const buildSOAPXML = (data) => {
const {
    receiverName,
    receiverAddress,
    receiverCity,
    receiverPostalCode,
    receiverStateCode,
    receiverPhone,
    receiverCountryCode,
    declaredValue,
    currency,
    weight = 1, 
    length,
    width,
    height,
    cartItems, 
   freightCharge = '0.00',
  } = data;



const totalLineValue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  const totalQuantity = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  
  const dutiableValue = declaredValue && !isNaN(parseFloat(declaredValue))
    ? parseFloat(declaredValue).toFixed(2)
    : totalLineValue;

  
  const invoiceRatePerUnit = totalQuantity > 0 ? (parseFloat(totalLineValue) / totalQuantity).toFixed(2) : '0.00';

  const freight = parseFloat(freightCharge || '0').toFixed(2);
  const shipContents = cartItems.map(item => `${item.name} (x${item.quantity})`).join(', ') || 'General merchandise';

  const currentDate = getCurrentDate();
  const consigneeCountryName = receiverCountryCode === 'US' ? 'United States' : (receiverCountryCode || 'US');

  const total = (parseFloat(freight) + parseFloat(dutiableValue)).toFixed(2);
    const totalAmountInWords = convertAmountToWords(total, currency);
console.log("✅ Total:", total);

  console.log("✅ DHL Line Value:", totalLineValue);
  console.log("✅ Freight Charge:", freight);
  console.log("✅ Dutiable Value:", dutiableValue);
  console.log("✅ Invoice Rate Per Unit:", invoiceRatePerUnit);



  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:dhl="http://schemas.datacontract.org/2004/07/DHLWCFService.App_Code">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:PostShipment_CSBV>
         <tem:Shipmentpurpose>CSBV</tem:Shipmentpurpose>
         <tem:ShipperAccNumber>537986109</tem:ShipperAccNumber>
         <tem:ShippingPaymentType>S</tem:ShippingPaymentType>
         <tem:BillingAccNumber>537986109</tem:BillingAccNumber>
        <tem:ConsigneeCompName>${receiverName || 'Test Name'}</tem:ConsigneeCompName>
         <tem:ConsigneeAddLine1>${receiverAddress || 'Add2'}</tem:ConsigneeAddLine1>
         <tem:ConsigneeAddLine2>${receiverCountryCode || 'US'}</tem:ConsigneeAddLine2>
         <tem:ConsigneeAddLine3></tem:ConsigneeAddLine3>
       <tem:ConsigneeCity>${receiverCity}</tem:ConsigneeCity>
         <tem:ConsigneeDivCode>${receiverStateCode || 'NY'}</tem:ConsigneeDivCode>
         <tem:PostalCode>${receiverPostalCode || '10001'}</tem:PostalCode>
         <tem:ConsigneeCountryCode>${receiverCountryCode || 'US'}</tem:ConsigneeCountryCode>
               <tem:ConsigneeCountryName>${consigneeCountryName}</tem:ConsigneeCountryName>
         <tem:ConsigneeName>${receiverName || 'Test Name'}</tem:ConsigneeName>
         <tem:ConsigneePh>${receiverPhone || '8888888888'}</tem:ConsigneePh>
         <tem:ConsigneeEmail>asd@gmail.com</tem:ConsigneeEmail>
         <tem:RegistrationNumber></tem:RegistrationNumber>
         <tem:RegistrationNumberTypeCode></tem:RegistrationNumberTypeCode>
         <tem:RegistrationNumberIssuerCountryCode></tem:RegistrationNumberIssuerCountryCode>
         <tem:BusinessPartyTypeCode></tem:BusinessPartyTypeCode>
  <tem:DutiableDeclaredvalue>${total}</tem:DutiableDeclaredvalue>
         <tem:DutiableDeclaredCurrency>${currency}</tem:DutiableDeclaredCurrency>
         <tem:ShipNumberOfPieces>${cartItems.length}</tem:ShipNumberOfPieces>
         <tem:ShipCurrencyCode>USD</tem:ShipCurrencyCode>
       <tem:ShipPieceWt>${weight || '1'}</tem:ShipPieceWt>
         <tem:ShipPieceDepth>${length || '10'}</tem:ShipPieceDepth>
         <tem:ShipPieceWidth>${width || '10'}</tem:ShipPieceWidth>
         <tem:ShipPieceHeight>${height || '10'}</tem:ShipPieceHeight>
         <tem:ShipGlobalProductCode>P</tem:ShipGlobalProductCode>
         <tem:ShipLocalProductCode>P</tem:ShipLocalProductCode>
        <tem:ShipContents>${shipContents || 'General merchandise'}</tem:ShipContents>
         <tem:ShipperId>537986109</tem:ShipperId>
         <tem:ShipperCompName>NEIGHTIV INDIA PRIVATE LIMITED</tem:ShipperCompName>
         <tem:ShipperAddress1>Suguna Upper Crest Gattigere</tem:ShipperAddress1>
         <tem:ShipperAddress2>RR Nagar Bangalore</tem:ShipperAddress2>
         <tem:ShipperAddress3></tem:ShipperAddress3>
         <tem:ShipperCountryCode>IN</tem:ShipperCountryCode>
         <tem:ShipperCountryName>INDIA</tem:ShipperCountryName>
         <tem:ShipperCity>Bangalore</tem:ShipperCity>
         <tem:ShipperPostalCode>560098</tem:ShipperPostalCode>
         <tem:ShipperPhoneNumber>8569949497</tem:ShipperPhoneNumber>
         <tem:SiteId>neightivindIN</tem:SiteId>
         <tem:Password>K@4hK^6yH#2rC$4l</tem:Password>
         <tem:ShipperName>Srinivasmn Nagaraja</tem:ShipperName>
         <tem:ShipperRef>TestShipment</tem:ShipperRef>
         <tem:ShipperRegistrationNumber></tem:ShipperRegistrationNumber>
         <tem:ShipperRegistrationNumberTypeCode></tem:ShipperRegistrationNumberTypeCode>
         <tem:ShipperRegistrationNumberIssuerCountryCode></tem:ShipperRegistrationNumberIssuerCountryCode>
         <tem:ShipperBusinessPartyTypeCode></tem:ShipperBusinessPartyTypeCode>
         <tem:BillToCompanyName>${receiverName || 'Test Name'}</tem:BillToCompanyName>
         <tem:BillToContactName>${receiverName || 'Test Name'}</tem:BillToContactName>
         <tem:BillToAddressLine1>${receiverAddress || 'Add2'}</tem:BillToAddressLine1>
         <tem:BillToCity>${receiverCity}</tem:BillToCity>
         <tem:BillToPostcode>${receiverPostalCode || '10001'}</tem:BillToPostcode>
         <tem:BillToSuburb></tem:BillToSuburb>
         <tem:BillToState>${receiverStateCode || 'NY'}</tem:BillToState>
         <tem:BillToCountryName>${consigneeCountryName}</tem:BillToCountryName>
         <tem:BillToCountryCode>${receiverCountryCode || 'US'}</tem:BillToCountryCode>
         <tem:BillToPhoneNumber>${receiverPhone || '8888888888'}</tem:BillToPhoneNumber>
         <tem:IECNo>DJKPM1845K</tem:IECNo>
         <tem:TermsOfTrade>DAP</tem:TermsOfTrade>
         <tem:Usingecommerce>1</tem:Usingecommerce>
         <tem:IsUnderMEISScheme>0</tem:IsUnderMEISScheme>
         <tem:GSTIN>29AAJCN9859L1ZC</tem:GSTIN>
         <tem:GSTInvNo>6757751226641</tem:GSTInvNo>
         <tem:GSTInvNoDate>${currentDate}</tem:GSTInvNoDate>
         <tem:NonGSTInvNo></tem:NonGSTInvNo>
         <tem:NonGSTInvDate></tem:NonGSTInvDate>
         <tem:IsUsingIGST>NO</tem:IsUsingIGST>
         <tem:UsingBondorUT>YES</tem:UsingBondorUT>
         <tem:BankADCode>0003286</tem:BankADCode>
         <tem:Exporter_CompanyName></tem:Exporter_CompanyName>
         <tem:Exporter_AddressLine1></tem:Exporter_AddressLine1>
         <tem:Exporter_AddressLine2></tem:Exporter_AddressLine2>
         <tem:Exporter_AddressLine3></tem:Exporter_AddressLine3>
         <tem:Exporter_City></tem:Exporter_City>
         <tem:Exporter_DivisionCode></tem:Exporter_DivisionCode>
         <tem:Exporter_PostalCode></tem:Exporter_PostalCode>
         <tem:Exporter_CountryCode></tem:Exporter_CountryCode>
         <tem:Exporter_CountryName></tem:Exporter_CountryName>
         <tem:Exporter_PersonName></tem:Exporter_PersonName>
         <tem:Exporter_PhoneNumber></tem:Exporter_PhoneNumber>
         <tem:Exporter_Email></tem:Exporter_Email>
         <tem:Exporter_MobilePhoneNumber></tem:Exporter_MobilePhoneNumber>
         <tem:Exporter_RegistrationNumber></tem:Exporter_RegistrationNumber>
         <tem:Exporter_RegistrationNumberTypeCode></tem:Exporter_RegistrationNumberTypeCode>
         <tem:Exporter_RegistrationNumberIssuerCountryCode></tem:Exporter_RegistrationNumberIssuerCountryCode>
         <tem:Exporter_BusinessPartyTypeCode></tem:Exporter_BusinessPartyTypeCode>
         <tem:UseDHLInvoice>Y</tem:UseDHLInvoice>
         <tem:SignatureName></tem:SignatureName>
         <tem:SignatureTitle></tem:SignatureTitle>
         <tem:LicenseNumber></tem:LicenseNumber>
         <tem:ExpiryDate></tem:ExpiryDate>
         <tem:ManufactureCountryCode>IN</tem:ManufactureCountryCode>
         <tem:ManufactureCountryName>INDIA</tem:ManufactureCountryName>
         <tem:SerialNumber>1</tem:SerialNumber>
      <tem:FOBValue>${dutiableValue}</tem:FOBValue>
         <tem:Discount>0</tem:Discount>
         <tem:Description>1 ${shipContents || 'General merchandise'}</tem:Description>
        <tem:Qty>${totalQuantity}</tem:Qty>
       <tem:Weight>1</tem:Weight>
         <tem:HSCode>62141090</tem:HSCode>
         <tem:CommodityCode></tem:CommodityCode>
         <tem:CommodityType>OTHERS</tem:CommodityType>
    <tem:InvoiceRatePerUnit>${invoiceRatePerUnit}</tem:InvoiceRatePerUnit>
         <tem:ShipPieceUOM>PCS</tem:ShipPieceUOM>
         <tem:ShipPieceCESS>0</tem:ShipPieceCESS>
         <tem:ShipPieceIGSTPercentage>10</tem:ShipPieceIGSTPercentage>
 <tem:ShipPieceIGST></tem:ShipPieceIGST>
         <tem:ShipPieceTaxableValue>${dutiableValue}</tem:ShipPieceTaxableValue>
         <tem:FreightCharge>${freight}</tem:FreightCharge>
         <tem:InsuranceCharge>0</tem:InsuranceCharge>
      <tem:TotalIGST></tem:TotalIGST>
         <tem:CessCharge>0</tem:CessCharge>
         <tem:ReverseCharge>0</tem:ReverseCharge>
         <tem:PayerGSTVAT></tem:PayerGSTVAT>
         <tem:IsResponseRequired>N</tem:IsResponseRequired>
         <tem:LabelReq>N</tem:LabelReq>
         <tem:SpecialService></tem:SpecialService>
         <tem:InsuredAmount>0</tem:InsuredAmount>
       <tem:Invoicevalueinword>${totalAmountInWords}</tem:Invoicevalueinword>
         <tem:Placeofsupply>Bangalore</tem:Placeofsupply>
         <tem:dateofsupply></tem:dateofsupply>
         <tem:Shipperstatecode>29</tem:Shipperstatecode>
         <tem:ShipperstateName>Karnataka</tem:ShipperstateName>
         <tem:isIndemnityClauseRead>YES</tem:isIndemnityClauseRead>
         <tem:ACCOUNT_NO>43576588042</tem:ACCOUNT_NO>
         <tem:GOV_NONGOV_TYPE>P</tem:GOV_NONGOV_TYPE>
         <tem:NFEI_FLAG>YES</tem:NFEI_FLAG>
         <tem:CustomerBarcodeCode></tem:CustomerBarcodeCode>
         <tem:CustomerBarcodeText></tem:CustomerBarcodeText>
      </tem:PostShipment_CSBV>
   </soapenv:Body>
</soapenv:Envelope>`;
};




router.post('/calculate-shipping-charge', async (req, res) => {
  try {
    const { receiverPostalCode, receiverCountryCode, receiverCity, cartItems, declaredValue, currency = 'USD' } = req.body;

    // Validate required fields
    if (!receiverPostalCode || !receiverCountryCode || !receiverCity || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({ error: 'Missing or invalid required fields: receiverPostalCode, receiverCountryCode, receiverCity, cartItems' });
    }

    // Validate country code
    const validatedCountryCode = validateCountryCode(receiverCountryCode);

    const totalDeclaredValue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const dutiableValue = declaredValue && !isNaN(parseFloat(declaredValue))
      ? parseFloat(declaredValue).toFixed(2)
      : totalDeclaredValue.toFixed(2);

    const soapRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
         <soapenv:Header/>
         <soapenv:Body>
            <tem:PostQuote_RAS>
               <tem:ShipperPostCode>560098</tem:ShipperPostCode>
               <tem:ReceiverCountryCode>${validatedCountryCode}</tem:ReceiverCountryCode>
               <tem:PostCode>${receiverPostalCode}</tem:PostCode>
               <tem:fromCity>Bangalore</tem:fromCity>
               <tem:IsDutiable>Y</tem:IsDutiable>
               <tem:PickupHours>17</tem:PickupHours>
               <tem:PickupMinutes>00</tem:PickupMinutes>
               <tem:DeclaredCurrency>${currency}</tem:DeclaredCurrency>
               <tem:DeclaredValue>${dutiableValue}</tem:DeclaredValue>
               <tem:NetworkTypeCode>AL</tem:NetworkTypeCode>
               <tem:GlobalProductCode>P</tem:GlobalProductCode>
               <tem:LocalProductCode>P</tem:LocalProductCode>
               <tem:toCity>${receiverCity}</tem:toCity>
               <tem:PaymentAccountNumber>537986109</tem:PaymentAccountNumber>
               <tem:pieces>1</tem:pieces>
               <tem:ShipPieceWt>0.5</tem:ShipPieceWt>
               <tem:ShipPieceDepth>5</tem:ShipPieceDepth>
               <tem:ShipPieceWidth>30</tem:ShipPieceWidth>
               <tem:ShipPieceHeight>33</tem:ShipPieceHeight>
            </tem:PostQuote_RAS>
         </soapenv:Body>
      </soapenv:Envelope>`;

    const response = await axios.post(
      'https://api.india.express.dhl.com/DHLWCFService_V6/DHLService.svc',
      soapRequest,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'http://tempuri.org/IDHLService/PostQuote_RAS',
          'Cookie': req.body.cookie || 'YOUR_COOKIE_HERE',
        },
      }
    );

    console.log('Raw SOAP Response:', response.data);
    const shippingCharge = await parseSoapResponse(response.data);
    res.status(200).json({ shippingCharge });
  } catch (err) {
    console.error('DHL Shipping Charge Error:', err?.response?.data || err.message);
    res.status(400).json({ error: err.message || 'Failed to calculate shipping charge.' });
  }
});

// Existing create-shipment endpoint
// router.post('/create-shipment', async (req, res) => {
//   try {
//     const { receiverCountryCode } = req.body;
//     validateCountryCode(receiverCountryCode); 
//     const xml = buildSOAPXML(req.body);
//     const response = await axios.post(
//       'https://api.india.express.dhl.com/DHLWCFService_V6/DHLService.svc',
//       xml,
//       {
//         headers: {
//           'Content-Type': 'text/xml;charset=UTF-8',
//           'SOAPAction': 'http://tempuri.org/IDHLService/PostShipment_CSBV',
//           'Cookie': req.body.cookie || 'YOUR_COOKIE_HERE',
//         },
//       }
//     );
//     res.status(200).send(response.data);
//   } catch (err) {
//     console.error('DHL SOAP error:', err?.response?.data || err.message);
//     res.status(400).json({ error: err.message || 'Failed to create DHL shipment.' });
//   }
// });


// router.post('/create-shipment', async (req, res) => {
//   try {
//     const { receiverCountryCode } = req.body;
//     validateCountryCode(receiverCountryCode);
//     const xml = buildSOAPXML(req.body);

//     // Make the API call to DHL service
//     const response = await axios.post(
//       'https://api.india.express.dhl.com/DHLWCFService_V6/DHLService.svc',
//       xml,
//       {
//         headers: {
//           'Content-Type': 'text/xml;charset=UTF-8',
//           'SOAPAction': 'http://tempuri.org/IDHLService/PostShipment_CSBV',
//           'Cookie': req.body.cookie || 'YOUR_COOKIE_HERE',
//         },
//       }
//     );

//     // Extract <PostShipment_CSBVResult> content
//     const resultMatch = response.data.match(/<PostShipment_CSBVResult>(.*?)<\/PostShipment_CSBVResult>/s);
//     const resultText = resultMatch ? resultMatch[1].trim() : '';

//     // Extract both PDF URLs
//     const urls = resultText.match(/https?:\/\/[^\s;]+\.pdf/gi);
//     const [shipmentPdfPath, invoicePath] = urls || [];

//     if (!shipmentPdfPath || !invoicePath) {
//       throw new Error('Could not extract both shipment and invoice PDF URLs from DHL response');
//     }

//     // Download and parse both PDFs
//     const [shipmentRes, invoiceRes] = await Promise.all([
//       axios.get(shipmentPdfPath, { responseType: 'arraybuffer' }),
//       axios.get(invoicePath, { responseType: 'arraybuffer' }),
//     ]);

//     const [shipmentParsed, invoiceParsed] = await Promise.all([
//       pdfParse(shipmentRes.data),
//       pdfParse(invoiceRes.data),
//     ]);

//     const pdfData = {
//       shipmentPdf: { text: shipmentParsed.text },
//       invoicePdf: { text: invoiceParsed.text },
//     };

//     // Extract AWB number from PDF text
//     const awbMatch = invoiceParsed.text.match(/AWB\s*No\s*[:\-]?\s*(\d{8,})/i);
//     const awbNo = awbMatch ? awbMatch[1].trim() : null;

//     if (!awbNo) {
//       throw new Error('AWB number not found in Invoice PDF');
//     }

//     // Optional fields (safely extracted)
//     const mobileMatch = invoiceParsed.text.match(/Telephone No[:\-]?\s*(\d+)/i);
//     const billToMatch = invoiceParsed.text.match(/Bill To Party\s+(.+?)\s+/i);

//     const mobileNumber = mobileMatch ? mobileMatch[1].trim() : '';
//     const billToPartyCompany = billToMatch ? billToMatch[1].trim() : '';


//     console.log(awbNo,
//       billToPartyCompany,
//       mobileNumber,
//       invoicePath,
//       shipmentPdfPath,)
//     // Save to MongoDB
//     const newDhlOrder = new DhlOrder({
//       awbNo,
//       billToPartyCompany,
//       mobileNumber,
//       invoicePath,
//       shipmentPdfPath,
//       pdfData,
//         receiverName: req.body.receiverName || '',      
//   receiverPhone: req.body.receiverPhone || '', 
//       status: 'Shipped',
//     });

//     await newDhlOrder.save();
//     console.log('✅ DHL order saved');

//     res.status(200).json({
//       message: 'DHL order created successfully',
//       awbNo,
//       invoicePath,
//       shipmentPdfPath,
//     });

//   } catch (err) {
//     console.error('❌ DHL create-shipment error:', err?.response?.data || err.message);
//     res.status(400).json({ error: err.message || 'Failed to create DHL shipment' });
//   }
// });

router.post('/create-shipment', async (req, res) => {
  try {
    const {
      receiverCountryCode,
      receiverName,
      receiverAddress,
      receiverCity,
      receiverPostalCode,
      receiverStateCode,
      receiverPhone,
      declaredValue,
      currency = 'USD',
      weight,
      length,
      width,
      height,
      cartItems,
      freightCharge,
      cookie,
    } = req.body;

    // Validate required fields
    if (!receiverCountryCode || !receiverName || !receiverAddress || !receiverCity || !receiverPostalCode || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({
        error: 'Missing required fields: receiverCountryCode, receiverName, receiverAddress, receiverCity, receiverPostalCode, cartItems',
      });
    }

    // Validate country code
    const validatedCountryCode = validateCountryCode(receiverCountryCode);

    // Validate currency
    const validCurrencies = Object.keys(currencyUnits);
    if (!validCurrencies.includes(currency.toUpperCase())) {
      return res.status(400).json({
        error: `Invalid currency code: ${currency}. Must be one of ${validCurrencies.join(', ')}.`,
      });
    }


    const items = cartItems.map(item => ({
      productId: item.sku, // Adjust to item.id if necessary
      quantity: item.quantity,
    }));

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.productId}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }
    }

    // Build SOAP XML
    const xml = buildSOAPXML(req.body);

    // Make SOAP request
    const response = await axios.post(
      'https://api.india.express.dhl.com/DHLWCFService_V6/DHLService.svc',
      xml,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'http://tempuri.org/IDHLService/PostShipment_CSBV',
          'Cookie': cookie || 'YOUR_COOKIE_HERE',
        },
      }
    );

    // Extract <PostShipment_CSBVResult> content
    const resultMatch = response.data.match(/<PostShipment_CSBVResult>(.*?)<\/PostShipment_CSBVResult>/s);
    const resultText = resultMatch ? resultMatch[1].trim() : '';

    // Extract PDF URLs
    const urls = resultText.match(/https?:\/\/[^\s;]+\.pdf/gi);
    const [shipmentPdfPath, invoicePath] = urls || [];

    if (!shipmentPdfPath || !invoicePath) {
      throw new Error('Could not extract both shipment and invoice PDF URLs from DHL response');
    }

    // Download and parse PDFs
    const [shipmentRes, invoiceRes] = await Promise.all([
      axios.get(shipmentPdfPath, { responseType: 'arraybuffer' }),
      axios.get(invoicePath, { responseType: 'arraybuffer' }),
    ]);

    const [shipmentParsed, invoiceParsed] = await Promise.all([
      pdfParse(shipmentRes.data),
      pdfParse(invoiceRes.data),
    ]);

    const pdfData = {
      shipmentPdf: { text: shipmentParsed.text },
      invoicePdf: { text: invoiceParsed.text },
    };

    // Extract AWB number
    const awbMatch = invoiceParsed.text.match(/AWB\s*No\s*[:\-]?\s*(\d{8,})/i);
    const awbNo = awbMatch ? awbMatch[1].trim() : null;

    if (!awbNo) {
      throw new Error('AWB number not found in Invoice PDF');
    }

    // Extract optional fields
    const mobileMatch = invoiceParsed.text.match(/Telephone No[:\-]?\s*(\d+)/i);
    const billToMatch = invoiceParsed.text.match(/Bill To Party\s+(.+?)\s+/i);

    const mobileNumber = mobileMatch ? mobileMatch[1].trim() : '';
    const billToPartyCompany = billToMatch ? billToMatch[1].trim() : '';

    // Save to MongoDB
    const newDhlOrder = new DhlOrder({
      awbNo,
      billToPartyCompany,
      mobileNumber,
      invoicePath,
      shipmentPdfPath,
      pdfData,
      receiverName: receiverName || '',
      receiverPhone: receiverPhone || '',
      status: 'Shipped',
    });

    await newDhlOrder.save();
    console.log('✅ DHL order saved');

    // Update stock after successful shipment creation
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        product.soldStock = (product.soldStock || 0) + item.quantity;
        await product.save();
      }
    }

    res.status(200).json({
      message: 'DHL order created successfully',
      awbNo,
      invoicePath,
      shipmentPdfPath,
    });
  } catch (err) {
    console.error('❌ DHL create-shipment error:', err?.response?.data || err.message);
    res.status(400).json({
      error: 'Failed to create DHL shipment',
      details: err.message || 'An unexpected error occurred',
    });
  }
});

router.post('/schedule-pickup', async (req, res) => {
  try {
    const {
      ShipperCompName,
      ShipperAdd1,
      ShipperAdd2,
      ShipperAdd3,
      PackageLocation,
      Shippercity,
      ShipperPostCode,
      ShipperCountyCode,
      ShipperName,
      ShipperPhone,
      PickupClosingTimeHrs,
      PickupClosingTimeMins,
      Pieces,
      PickupWeight,
      PickupContactName,
      PickupContactPhone,
      PickupDate,
      ReadyByTime,
      AccountNumber,
      cookie,
    } = req.body;

    // Validate required fields
    const requiredFields = {
      ShipperCompName,
      ShipperAdd1,
      Shippercity,
      ShipperPostCode,
      ShipperCountyCode,
      ShipperName,
      ShipperPhone,
      PickupClosingTimeHrs,
      PickupClosingTimeMins,
      Pieces,
      PickupWeight,
      PickupContactName,
      PickupContactPhone,
      PickupDate,
      ReadyByTime,
      AccountNumber,
      cookie,
    };

    const missingFields = Object.keys(requiredFields).filter(
      (key) => requiredFields[key] === undefined || requiredFields[key] === null || requiredFields[key] === ''
    );
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing or empty required fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate country code
    const validatedCountryCode = validateCountryCode(ShipperCountyCode);

    // Validate numeric fields
    if (isNaN(Pieces) || Pieces <= 0) {
      return res.status(400).json({
        error: 'Pieces must be a positive number',
      });
    }
    if (isNaN(PickupWeight) || PickupWeight <= 0) {
      return res.status(400).json({
        error: 'PickupWeight must be a positive number',
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(PickupDate)) {
      return res.status(400).json({
        error: 'Invalid PickupDate format. Use YYYY-MM-DD.',
      });
    }

    // Validate date is today or future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pickupDateObj = new Date(PickupDate);
    if (pickupDateObj < today) {
      return res.status(400).json({
        error: 'PickupDate must be today or in the future.',
      });
    }

    // Validate time formats
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(ReadyByTime)) {
      return res.status(400).json({
        error: 'Invalid ReadyByTime format. Use HH:MM (24-hour).',
      });
    }
    if (!/^\d{2}$/.test(PickupClosingTimeHrs) || parseInt(PickupClosingTimeHrs) > 23) {
      return res.status(400).json({
        error: 'Invalid PickupClosingTimeHrs. Must be 00-23.',
      });
    }
    if (!/^\d{2}$/.test(PickupClosingTimeMins) || parseInt(PickupClosingTimeMins) > 59) {
      return res.status(400).json({
        error: 'Invalid PickupClosingTimeMins. Must be 00-59.',
      });
    }

    // Build SOAP XML for pickup request
    const soapRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
         <soapenv:Header/>
         <soapenv:Body>
            <tem:PostPickup>
               <tem:ShipperCompName>${ShipperCompName}</tem:ShipperCompName>
               <tem:ShipperAdd1>${ShipperAdd1}</tem:ShipperAdd1>
               <tem:ShipperAdd2>${ShipperAdd2 || ''}</tem:ShipperAdd2>
               <tem:ShipperAdd3>${ShipperAdd3 || ''}</tem:ShipperAdd3>
               <tem:PackageLocation>${PackageLocation || 'Front Desk'}</tem:PackageLocation>
               <tem:Shippercity>${Shippercity}</tem:Shippercity>
               <tem:ShipperPostCode>${ShipperPostCode}</tem:ShipperPostCode>
               <tem:ShipperCountyCode>${validatedCountryCode}</tem:ShipperCountyCode>
               <tem:ShipperName>${ShipperName}</tem:ShipperName>
               <tem:ShipperPhone>${ShipperPhone}</tem:ShipperPhone>
               <tem:PickupClosingTimeHrs>${PickupClosingTimeHrs}</tem:PickupClosingTimeHrs>
               <tem:PickupClosingTimeMins>${PickupClosingTimeMins}</tem:PickupClosingTimeMins>
               <tem:Pieces>${Pieces}</tem:Pieces>
               <tem:PickupWeight>${PickupWeight}</tem:PickupWeight>
               <tem:PickupContactName>${PickupContactName}</tem:PickupContactName>
               <tem:PickupContactPhone>${PickupContactPhone}</tem:PickupContactPhone>
               <tem:PickupDate>${PickupDate}</tem:PickupDate>
               <tem:ReadyByTime>${ReadyByTime}</tem:ReadyByTime>
               <tem:AccountNumber>${AccountNumber}</tem:AccountNumber>
            </tem:PostPickup>
         </soapenv:Body>
      </soapenv:Envelope>`;

    // Log the SOAP request for debugging
    console.log('SOAP Request:', soapRequest);

    // Make SOAP request to DHL API
    const response = await axios.post(
      'https://api.india.express.dhl.com/DHLWCFService_V6/DHLService.svc',
      soapRequest,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'http://tempuri.org/IDHLService/PostPickup',
          'Cookie': cookie || 'BIGipServerpl_dhlindiaplugin.com_443=!kfK86nQDmrO5xHN7MRQuST572YnrLoX+aA9KG8LvRIoHyHDhKvVgxCohP45xRRZHulE7tIVNWMbx4H8=; TS019cb396=010448b6557e17734619b004fae56ca049e24d13e4dbb0d9f28ebb249618f176d43bbee665ad32c4edd7daf2f9f4ec340e1fba98ff',
        },
      }
    );

    // Log the raw SOAP response for debugging
    console.log('Raw SOAP Response:', response.data);

    // Parse SOAP response
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });

    const result = await parser.parseStringPromise(response.data);
    const pickupResult = result?.Envelope?.Body?.PostPickupResponse?.PostPickupResult;

    if (!pickupResult) {
      throw new Error('No PostPickupResult found in SOAP response.');
    }

    // Attempt to extract confirmation details (adjust based on actual DHL response structure)
    let confirmationId = pickupResult;
    let trackingNumber = null;
    if (typeof pickupResult === 'string') {
      const confirmationMatch = pickupResult.match(/Confirmation\s*Number\s*[:\-]\s*(\w+)/i);
      confirmationId = confirmationMatch ? confirmationMatch[1] : pickupResult;
      const trackingMatch = pickupResult.match(/Tracking\s*Number\s*[:\-]\s*(\w+)/i);
      trackingNumber = trackingMatch ? trackingMatch[1] : null;
    }

    // Check for error in response
    if (pickupResult.includes('Error') || pickupResult.includes('Failed')) {
      throw new Error(`Pickup request failed: ${pickupResult}`);
    }

    res.status(200).json({
      status: 'success',
      message: 'Pickup scheduled successfully',
      confirmationId: confirmationId,
      pickupDate: PickupDate,
      readyByTime: ReadyByTime,
      trackingNumber: trackingNumber,
    });
  } catch (error) {
    console.error('❌ DHL schedule-pickup error:', error?.response?.data || error.message);
    console.error('Error Stack:', error.stack);
    res.status(400).json({
      status: 'error',
      error: 'Failed to schedule DHL pickup',
      details: error.message || 'An unexpected error occurred',
    });
  }
});






module.exports = router;
