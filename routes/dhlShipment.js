const express = require('express');
const axios = require('axios');
const router = express.Router();
const numberToWords = require('number-to-words');

const convertAmountToWords = (amount) => {
  // Split the amount into whole number and decimal (cents)
  const [wholeNumber, decimal] = amount.toString().split('.');

  // Convert the whole number part to words
  let wholeNumberInWords = numberToWords.toWords(wholeNumber).replace(/ and/g, ', and');

  // Capitalize the first letter of the whole number
  wholeNumberInWords = wholeNumberInWords.charAt(0).toUpperCase() + wholeNumberInWords.slice(1);

  // Handle the decimal part (cents)
  const decimalInWords = decimal ? ` and ${numberToWords.toWords(decimal)} Cents` : '';

  // Construct the final string in the desired format
  return `${wholeNumberInWords}${decimalInWords ? decimalInWords : ''} only`;
};



// Function to build the SOAP XML with shipping details
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
    // weight,
    weight = 1, 
    length,
    width,
    height,
    cartItems, 
  } = data;



  //    const totalDeclaredValue = cartItems.reduce((sum, item) => {
    
  //   return sum + (item.price * item.quantity);
  // }, 0);

 
  // const dutiableValue = declaredValue || totalDeclaredValue.toFixed(2);

  // const taxableValue = dutiableValue; // In this case, the taxable value can be the same as the dutiable value

  //  const shipContents = cartItems.map(item => `${item.name} (x${item.quantity})`).join(', ') || 'General merchandise';

  // Calculate total declared value from cart items
  const totalDeclaredValue = cartItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  // Hardcode total quantity to 2 for testing
  const totalQuantity = 1;

  // Use declaredValue if provided and valid, otherwise use totalDeclaredValue
  const dutiableValue = (declaredValue && !isNaN(parseFloat(declaredValue)))
    ? parseFloat(declaredValue).toFixed(2)
    : totalDeclaredValue.toFixed(2);

  // Calculate InvoiceRatePerUnit based on dutiableValue and totalQuantity
  const invoiceRatePerUnit = totalQuantity > 0
    ? (dutiableValue / totalQuantity).toFixed(2)
    : (0).toFixed(2);

  const taxableValue = dutiableValue; // Taxable value same as dutiable value
  const shipContents = cartItems.map(item => `${item.name} (x${item.quantity})`).join(', ') || 'General merchandise';
  

    const totalAmountInWords = convertAmountToWords(dutiableValue);

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
         <tem:ConsigneeCountryName>${receiverCountryCode === 'US'}</tem:ConsigneeCountryName>
         <tem:ConsigneeName>${receiverName || 'Test Name'}</tem:ConsigneeName>
         <tem:ConsigneePh>${receiverPhone || '8888888888'}</tem:ConsigneePh>
         <tem:ConsigneeEmail>asd@gmail.com</tem:ConsigneeEmail>
         <tem:RegistrationNumber></tem:RegistrationNumber>
         <tem:RegistrationNumberTypeCode></tem:RegistrationNumberTypeCode>
         <tem:RegistrationNumberIssuerCountryCode></tem:RegistrationNumberIssuerCountryCode>
         <tem:BusinessPartyTypeCode></tem:BusinessPartyTypeCode>
  <tem:DutiableDeclaredvalue>${dutiableValue}</tem:DutiableDeclaredvalue>
         <tem:DutiableDeclaredCurrency>USD</tem:DutiableDeclaredCurrency>
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
         <tem:BillToCompanyName></tem:BillToCompanyName>
         <tem:BillToContactName></tem:BillToContactName>
         <tem:BillToAddressLine1></tem:BillToAddressLine1>
         <tem:BillToCity></tem:BillToCity>
         <tem:BillToPostcode></tem:BillToPostcode>
         <tem:BillToSuburb></tem:BillToSuburb>
         <tem:BillToState></tem:BillToState>
         <tem:BillToCountryName></tem:BillToCountryName>
         <tem:BillToCountryCode></tem:BillToCountryCode>
         <tem:BillToPhoneNumber></tem:BillToPhoneNumber>
         <tem:IECNo>DJKPM1845K</tem:IECNo>
         <tem:TermsOfTrade>DAP</tem:TermsOfTrade>
         <tem:Usingecommerce>1</tem:Usingecommerce>
         <tem:IsUnderMEISScheme>0</tem:IsUnderMEISScheme>
         <tem:GSTIN>29AAJCN9859L1ZC</tem:GSTIN>
         <tem:GSTInvNo>6757751226641</tem:GSTInvNo>
         <tem:GSTInvNoDate>2025-05-23</tem:GSTInvNoDate>
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
      <tem:FOBValue>${taxableValue}</tem:FOBValue>
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
         <tem:FreightCharge>0</tem:FreightCharge>
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
         <tem:NFEI_FLAG>NO</tem:NFEI_FLAG>
         <tem:CustomerBarcodeCode></tem:CustomerBarcodeCode>
         <tem:CustomerBarcodeText></tem:CustomerBarcodeText>
      </tem:PostShipment_CSBV>
   </soapenv:Body>
</soapenv:Envelope>`;
};

// Define the route for creating DHL shipment
router.post('/create-shipment', async (req, res) => {
  try {
    const xml = buildSOAPXML(req.body); // Build the XML from the request body

    // Send SOAP request to DHL API
    const response = await axios.post(
      'https://api.india.express.dhl.com/DHLWCFService_V6/DHLService.svc',
      xml,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'http://tempuri.org/IDHLService/PostShipment_CSBV',
           'Cookie': req.body.cookie || 'YOUR_COOKIE_HERE',
        },
      }
    );

    // Return the response from DHL back to the frontend
    res.status(200).send(response.data); 
  } catch (err) {
    console.error('DHL SOAP error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create DHL shipment.' });
  }
});

module.exports = router;
