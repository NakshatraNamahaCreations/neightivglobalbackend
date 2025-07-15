// const soap = require("soap");

// const wsdlUrl = "https://api.india.express.dhl.com/DHLWCFService_V6/DHLService.svc?wsdl";

// // Helper function to validate and convert input data
// const validateAndConvert = (value, fieldName, type, required = true, constraints = {}) => {
//   if (required && (value === undefined || value === null || value === "")) {
//     throw new Error(`Missing required field: ${fieldName}`);
//   }
//   if (value === undefined || value === null) return undefined;

//   switch (type) {
//     case "string":
//       return String(value);
//     case "uppercaseString":
//       return String(value).toUpperCase();
//     case "integer":
//       const intValue = parseInt(value, 10);
//       if (isNaN(intValue) || (constraints.min !== undefined && intValue < constraints.min) || (constraints.max !== undefined && intValue > constraints.max)) {
//         throw new Error(`Invalid ${fieldName}: must be an integer ${constraints.min !== undefined ? `>= ${constraints.min}` : ""} ${constraints.max !== undefined ? `<= ${constraints.max}` : ""}`);
//       }
//       return intValue;
//     case "float":
//       const floatValue = parseFloat(value);
//       if (isNaN(floatValue) || (constraints.min !== undefined && floatValue < constraints.min)) {
//         throw new Error(`Invalid ${fieldName}: must be a number ${constraints.min !== undefined ? `>= ${constraints.min}` : ""}`);
//       }
//       return floatValue;
//     default:
//       return value;
//   }
// };

// // Controller for creating a shipping quote (PostQuote_RAS)
// exports.createShippingQuote = async (req, res) => {
//   try {
//     const {
//       ShipperPostCode,
//       ReceiverCountryCode,
//       PostCode,
//       fromCity,
//       toCity,
//       IsDutiable,
//       PickupHours,
//       PickupMinutes,
//       DeclaredCurrency,
//       DeclaredValue,
//       NetworkTypeCode,
//       GlobalProductCode,
//       LocalProductCode,
//       PaymentAccountNumber,
//       pieces,
//       ShipPieceWt,
//       ShipPieceDepth,
//       ShipPieceWidth,
//       ShipPieceHeight,
//     } = req.body;

//     // Log input data
//     console.log("Received Shipping Quote Data:", JSON.stringify(req.body, null, 2));

//     // Validate and convert inputs with fallbacks
//     const args = {
//       ShipperPostCode: validateAndConvert(ShipperPostCode, "ShipperPostCode", "string", true) || "500034",
//       ReceiverCountryCode: validateAndConvert(ReceiverCountryCode, "ReceiverCountryCode", "uppercaseString", true) || "US",
//       PostCode: validateAndConvert(PostCode, "PostCode", "string", true) || "10001",
//       fromCity: validateAndConvert(fromCity, "fromCity", "uppercaseString", true) || "HYDERABAD",
//       toCity: validateAndConvert(toCity, "toCity", "uppercaseString", true) || "NEW YORK",
//       IsDutiable: validateAndConvert(IsDutiable, "IsDutiable", "uppercaseString", true, { valid: ["Y", "N"] }) || "Y",
//       PickupHours: validateAndConvert(PickupHours, "PickupHours", "string", true) || "17",
//       PickupMinutes: validateAndConvert(PickupMinutes, "PickupMinutes", "string", true) || "00",
//       DeclaredCurrency: validateAndConvert(DeclaredCurrency, "DeclaredCurrency", "uppercaseString", true) || "USD",
//       DeclaredValue: validateAndConvert(DeclaredValue, "DeclaredValue", "string", true) || "10",
//       NetworkTypeCode: validateAndConvert(NetworkTypeCode, "NetworkTypeCode", "string", true) || "D",
//       GlobalProductCode: validateAndConvert(GlobalProductCode, "GlobalProductCode", "string", true) || "D",
//       LocalProductCode: validateAndConvert(LocalProductCode, "LocalProductCode", "string", true) || "D",
//       PaymentAccountNumber: validateAndConvert(PaymentAccountNumber, "PaymentAccountNumber", "string", true) || "530017172",
//       pieces: validateAndConvert(pieces, "pieces", "string", true) || "1",
//       ShipPieceWt: validateAndConvert(ShipPieceWt, "ShipPieceWt", "string", true) || "1",
//       ShipPieceDepth: validateAndConvert(ShipPieceDepth, "ShipPieceDepth", "string", true) || "1",
//       ShipPieceWidth: validateAndConvert(ShipPieceWidth, "ShipPieceWidth", "string", true) || "1",
//       ShipPieceHeight: validateAndConvert(ShipPieceHeight, "ShipPieceHeight", "string", true) || "1",
//     };

//     // Additional validation
//     if (!["Y", "N"].includes(args.IsDutiable)) {
//       throw new Error("IsDutiable must be 'Y' or 'N'");
//     }
//     if (!/^\d{1,2}$/.test(args.PickupHours) || parseInt(args.PickupHours, 10) > 23) {
//       throw new Error("PickupHours must be a valid hour (00-23)");
//     }
//     if (!/^\d{1,2}$/.test(args.PickupMinutes) || parseInt(args.PickupMinutes, 10) > 59) {
//       throw new Error("PickupMinutes must be a valid minute (00-59)");
//     }
//     if (isNaN(parseFloat(args.DeclaredValue)) || parseFloat(args.DeclaredValue) <= 0) {
//       throw new Error("DeclaredValue must be a positive number");
//     }
//     if (isNaN(parseInt(args.pieces, 10)) || parseInt(args.pieces, 10) <= 0) {
//       throw new Error("pieces must be a positive integer");
//     }
//     if (isNaN(parseFloat(args.ShipPieceWt)) || parseFloat(args.ShipPieceWt) <= 0) {
//       throw new Error("ShipPieceWt must be a positive number");
//     }

//     // Log SOAP request arguments
//     console.log("SOAP Request Arguments:", JSON.stringify(args, null, 2));

//     // Create SOAP client
//     const client = await soap.createClientAsync(wsdlUrl);
//     console.log("SOAP Client Methods:", Object.keys(client));

//     // Log raw SOAP request and response
//     client.on("request", (xml) => {
//       console.log("Raw SOAP Request XML:", xml);
//     });
//     client.on("response", (xml) => {
//       console.log("Raw SOAP Response XML:", xml);
//     });
//     client.on("soapError", (err) => {
//       console.error("SOAP Client Error:", err);
//     });

//     // Make SOAP request
//     client.PostQuote_RAS(args, (err, result) => {
//       if (err) {
//         console.error("SOAP DHL Error:", err);
//         const fault = err.root?.Envelope?.Body?.Fault || {};
//         const errorMessage = fault.detail?.ExceptionDetail?.Message || fault.faultstring || err.message || "Unknown SOAP error";
//         console.error("SOAP Fault Details:", JSON.stringify(fault, null, 2));
//         return res.status(500).json({ message: "SOAP Error", error: errorMessage });
//       }
//       console.log("✅ DHL Shipping Quote Response:", JSON.stringify(result, null, 2));
//       res.json({ message: "Shipping quote retrieved successfully", data: result });
//     });
//   } catch (error) {
//     console.error("🚨 Unexpected Server Error:", error);
//     res.status(500).json({ message: "Server Crash", error: error.message });
//   }
// };
// // Controller for creating a pickup (PostPickup_v6)
// exports.createPickup = async (req, res) => {
//   try {
//     const {
//       ShipperCompName,
//       ShipperAdd1,
//       ShipperAdd2,
//       ShipperAdd3,
//       PackageLocation,
//       Shippercity,
//       ShipperPostCode,
//       ShipperCountyCode,
//       ShipperName,
//       ShipperPhone,
//       PickupClosingTimeHrs,
//       PickupClosingTimeMins,
//       Pieces,
//       PickupWeight,
//       PickupContactName,
//       PickupContactPhone,
//       PickupDate,
//       ReadyByTime,
//       AccountNumber,
//     } = req.body;

//     // Log input data
//     console.log("Received Pickup Data:", req.body);

//     // Validate and convert inputs
//     const args = {
//       ShipperCompName: validateAndConvert(ShipperCompName, "ShipperCompName", "string"),
//       ShipperAdd1: validateAndConvert(ShipperAdd1, "ShipperAdd1", "string"),
//       ShipperAdd2: validateAndConvert(ShipperAdd2, "ShipperAdd2", "string", false),
//       ShipperAdd3: validateAndConvert(ShipperAdd3, "ShipperAdd3", "string", false),
//       PackageLocation: validateAndConvert(PackageLocation, "PackageLocation", "string", false),
//       Shippercity: validateAndConvert(Shippercity, "Shippercity", "uppercaseString"),
//       ShipperPostCode: validateAndConvert(ShipperPostCode, "ShipperPostCode", "string"),
//       ShipperCountyCode: validateAndConvert(ShipperCountyCode, "ShipperCountyCode", "uppercaseString"),
//       ShipperName: validateAndConvert(ShipperName, "ShipperName", "string"),
//       ShipperPhone: validateAndConvert(ShipperPhone, "ShipperPhone", "string"),
//       PickupClosingTimeHrs: validateAndConvert(PickupClosingTimeHrs, "PickupClosingTimeHrs", "integer", true, { min: 0, max: 23 }),
//       PickupClosingTimeMins: validateAndConvert(PickupClosingTimeMins, "PickupClosingTimeMins", "integer", true, { min: 0, max: 59 }),
//       Pieces: validateAndConvert(Pieces, "Pieces", "integer", true, { min: 1 }),
//       PickupWeight: validateAndConvert(PickupWeight, "PickupWeight", "float", true, { min: 0 }),
//       PickupContactName: validateAndConvert(PickupContactName, "PickupContactName", "string"),
//       PickupContactPhone: validateAndConvert(PickupContactPhone, "PickupContactPhone", "string"),
//       PickupDate: validateAndConvert(PickupDate, "PickupDate", "string"),
//       ReadyByTime: validateAndConvert(ReadyByTime, "ReadyByTime", "string"),
//       AccountNumber: validateAndConvert(AccountNumber, "AccountNumber", "string"),
//     };

//     // Create SOAP client
//     const client = await soap.createClientAsync(wsdlUrl);
//     console.log("SOAP Client Methods:", Object.keys(client));

//     // Make SOAP request
//     client.PostPickup_v6(args, (err, result) => {
//       if (err) {
//         console.error("SOAP DHL Error:", err);
//         const fault = err.root?.Envelope?.Body?.Fault;
//         const errorMessage = fault?.detail?.ExceptionDetail?.Message || err.message || "Unknown SOAP error";
//         return res.status(500).json({ message: "SOAP Error", error: errorMessage });
//       }
//       console.log("✅ DHL Pickup Response:", result);
//       res.json({ message: "Pickup created successfully", data: result });
//     });
//   } catch (error) {
//     console.error("🚨 Unexpected Server Error:", error);
//     res.status(500).json({ message: "Server Crash", error: error.message });
//   }
// };

// // Controller for tracking a shipment (PostTracking_AllCheckpoint)
// exports.trackShipment = async (req, res) => {
//   try {
//     const { awbnumber } = req.body;

//     // Log input data
//     console.log("Received Tracking Data:", req.body);

//     // Validate input
//     const args = {
//       awbnumber: validateAndConvert(awbnumber, "awbnumber", "string"),
//     };

//     // Create SOAP client
//     const client = await soap.createClientAsync(wsdlUrl);
//     console.log("SOAP Client Methods:", Object.keys(client));

//     // Make SOAP request
//     client.PostTracking_AllCheckpoint(args, (err, result) => {
//       if (err) {
//         console.error("SOAP DHL Error:", err);
//         const fault = err.root?.Envelope?.Body?.Fault;
//         const errorMessage = fault?.detail?.ExceptionDetail?.Message || err.message || "Unknown SOAP error";
//         return res.status(500).json({ message: "Error tracking shipment", error: errorMessage });
//       }
//       console.log("✅ DHL Tracking Response:", result);
//       res.json({ message: "Tracking information retrieved successfully", data: result });
//     });
//   } catch (error) {
//     console.error("🚨 Unexpected Server Error:", error);
//     res.status(500).json({ message: "Server error in tracking shipment", error: error.message });
//   }
// };

// // Controller for creating a shipment (PostShipment_CSBV)
// exports.createDHLShipment = async (req, res) => {
//   try {
//     const {
//       Shipmentpurpose,
//       ShipperAccNumber,
//       ShippingPaymentType,
//       BillingAccNumber,
//       ConsigneeCompName,
//       ConsigneeAddLine1,
//       ConsigneeAddLine2,
//       ConsigneeAddLine3,
//       ConsigneeCity,
//       ConsigneeDivCode,
//       PostalCode,
//       ConsigneeCountryCode,
//       ConsigneeCountryName,
//       ConsigneeName,
//       ConsigneePh,
//       ConsigneeEmail,
//       DutiableDeclaredvalue,
//       DutiableDeclaredCurrency,
//       ShipNumberOfPieces,
//       ShipCurrencyCode,
//       ShipPieceWt,
//       ShipPieceDepth,
//       ShipPieceWidth,
//       ShipPieceHeight,
//       ShipGlobalProductCode,
//       ShipLocalProductCode,
//       ShipContents,
//       ShipperId,
//       ShipperCompName,
//       ShipperAddress1,
//       ShipperAddress2,
//       ShipperAddress3,
//       ShipperCountryCode,
//       ShipperCountryName,
//       ShipperCity,
//       ShipperPostalCode,
//       ShipperPhoneNumber,
//       SiteId,
//       Password,
//       ShipperName,
//       ShipperRef,
//       IECNo,
//       TermsOfTrade,
//       Usingecommerce,
//       GSTIN,
//       GSTInvNo,
//       GSTInvNoDate,
//       NonGSTInvNo,
//       NonGSTInvDate,
//       IsUsingIGST,
//       UsingBondorUT,
//       BankADCode,
//       UseDHLInvoice,
//       SignatureName,
//       SignatureTitle,
//       ManufactureCountryCode,
//       ManufactureCountryName,
//       SerialNumber,
//       FOBValue,
//       Discount,
//       Description,
//       Qty,
//       Weight,
//       HSCode,
//       CommodityCode,
//       CommodityType,
//       InvoiceRatePerUnit,
//       ShipPieceUOM,
//       ShipPieceCESS,
//       ShipPieceTaxableValue,
//       FreightCharge,
//       InsuranceCharge,
//       TotalIGST,
//       CessCharge,
//       ReverseCharge,
//       PayerGSTVAT,
//       IsResponseRequired,
//       LabelReq,
//       SpecialService,
//       InsuredAmount,
//       Invoicevalueinword,
//       Placeofsupply,
//       dateofsupply,
//       Shipperstatecode,
//       ShipperstateName,
//       isIndemnityClauseRead,
//     } = req.body;

//     // Log input data
//     console.log("Received Shipment Data:", JSON.stringify(req.body, null, 2));

//     // Validate and convert inputs with fallbacks
//     const args = {
//       Shipmentpurpose: validateAndConvert(Shipmentpurpose, "Shipmentpurpose", "string", true) || "CSBV",
//       ShipperAccNumber: validateAndConvert(ShipperAccNumber, "ShipperAccNumber", "string", true) || "530017172",
//       ShippingPaymentType: validateAndConvert(ShippingPaymentType, "ShippingPaymentType", "string", true) || "S",
//       BillingAccNumber: validateAndConvert(BillingAccNumber, "BillingAccNumber", "string", true) || "530017172",
//       ConsigneeCompName: validateAndConvert(ConsigneeCompName, "ConsigneeCompName", "string", true) || "Test Company",
//       ConsigneeAddLine1: validateAndConvert(ConsigneeAddLine1, "ConsigneeAddLine1", "string", true) || "123 Main St",
//       ConsigneeAddLine2: validateAndConvert(ConsigneeAddLine2, "ConsigneeAddLine2", "string", false) || "",
//       ConsigneeAddLine3: validateAndConvert(ConsigneeAddLine3, "ConsigneeAddLine3", "string", false) || "",
//       ConsigneeCity: validateAndConvert(ConsigneeCity, "ConsigneeCity", "uppercaseString", true) || "NEW YORK",
//       ConsigneeDivCode: validateAndConvert(ConsigneeDivCode, "ConsigneeDivCode", "string", false) || "",
//       PostalCode: validateAndConvert(PostalCode, "PostalCode", "string", true) || "10001",
//       ConsigneeCountryCode: validateAndConvert(ConsigneeCountryCode, "ConsigneeCountryCode", "uppercaseString", true) || "US",
//       ConsigneeCountryName: validateAndConvert(ConsigneeCountryName, "ConsigneeCountryName", "uppercaseString", true) || "UNITED STATES",
//       ConsigneeName: validateAndConvert(ConsigneeName, "ConsigneeName", "string", true) || "Test Recipient",
//       ConsigneePh: validateAndConvert(ConsigneePh, "ConsigneePh", "string", true) || "1234567890",
//       ConsigneeEmail: validateAndConvert(ConsigneeEmail, "ConsigneeEmail", "string", false) || "",
//       DutiableDeclaredvalue: validateAndConvert(DutiableDeclaredvalue, "DutiableDeclaredvalue", "string", true) || "10",
//       DutiableDeclaredCurrency: validateAndConvert(DutiableDeclaredCurrency, "DutiableDeclaredCurrency", "uppercaseString", true) || "USD",
//       ShipNumberOfPieces: validateAndConvert(ShipNumberOfPieces, "ShipNumberOfPieces", "string", true) || "1",
//       ShipCurrencyCode: validateAndConvert(ShipCurrencyCode, "ShipCurrencyCode", "uppercaseString", true) || "USD",
//       ShipPieceWt: validateAndConvert(ShipPieceWt, "ShipPieceWt", "string", true) || "1",
//       ShipPieceDepth: validateAndConvert(ShipPieceDepth, "ShipPieceDepth", "string", true) || "1",
//       ShipPieceWidth: validateAndConvert(ShipPieceWidth, "ShipPieceWidth", "string", true) || "1",
//       ShipPieceHeight: validateAndConvert(ShipPieceHeight, "ShipPieceHeight", "string", true) || "1",
//       ShipGlobalProductCode: validateAndConvert(ShipGlobalProductCode, "ShipGlobalProductCode", "string", true) || "D",
//       ShipLocalProductCode: validateAndConvert(ShipLocalProductCode, "ShipLocalProductCode", "string", true) || "D",
//       ShipContents: validateAndConvert(ShipContents, "ShipContents", "string", true) || "Sample Goods",
//       ShipperId: validateAndConvert(ShipperId, "ShipperId", "string", true) || "TEST_SHIPPER",
//       ShipperCompName: validateAndConvert(ShipperCompName, "ShipperCompName", "string", true) || "Test Shipper Co",
//       ShipperAddress1: validateAndConvert(ShipperAddress1, "ShipperAddress1", "string", true) || "456 Test Rd",
//       ShipperAddress2: validateAndConvert(ShipperAddress2, "ShipperAddress2", "string", false) || "",
//       ShipperAddress3: validateAndConvert(ShipperAddress3, "ShipperAddress3", "string", false) || "",
//       ShipperCountryCode: validateAndConvert(ShipperCountryCode, "ShipperCountryCode", "uppercaseString", true) || "IN",
//       ShipperCountryName: validateAndConvert(ShipperCountryName, "ShipperCountryName", "uppercaseString", true) || "INDIA",
//       ShipperCity: validateAndConvert(ShipperCity, "ShipperCity", "uppercaseString", true) || "HYDERABAD",
//       ShipperPostalCode: validateAndConvert(ShipperPostalCode, "ShipperPostalCode", "string", true) || "500034",
//       ShipperPhoneNumber: validateAndConvert(ShipperPhoneNumber, "ShipperPhoneNumber", "string", true) || "9876543210",
//       SiteId: validateAndConvert(SiteId, "SiteId", "string", true) || "neightivindIN", // Replace with actual SiteId
//       Password: validateAndConvert(Password, "Password", "string", true) || "K@4H^6yH#2rCs$4|", // Replace with actual Password
//       ShipperName: validateAndConvert(ShipperName, "ShipperName", "string", true) || "Test Shipper",
//       ShipperRef: validateAndConvert(ShipperRef, "ShipperRef", "string", false) || "",
//       IECNo: validateAndConvert(IECNo, "IECNo", "string", false) || "",
//       TermsOfTrade: validateAndConvert(TermsOfTrade, "TermsOfTrade", "string", true) || "DDP",
//       Usingecommerce: validateAndConvert(Usingecommerce, "Usingecommerce", "string", true) || "0",
//       GSTIN: validateAndConvert(GSTIN, "GSTIN", "string", false) || "",
//       GSTInvNo: validateAndConvert(GSTInvNo, "GSTInvNo", "string", false) || "",
//       GSTInvNoDate: validateAndConvert(GSTInvNoDate, "GSTInvNoDate", "string", false) || "",
//       NonGSTInvNo: validateAndConvert(NonGSTInvNo, "NonGSTInvNo", "string", false) || "",
//       NonGSTInvDate: validateAndConvert(NonGSTInvDate, "NonGSTInvDate", "string", false) || "",
//       IsUsingIGST: validateAndConvert(IsUsingIGST, "IsUsingIGST", "uppercaseString", true, { valid: ["YES", "NO"] }) || "NO",
//       UsingBondorUT: validateAndConvert(UsingBondorUT, "UsingBondorUT", "uppercaseString", true, { valid: ["YES", "NO"] }) || "NO",
//       BankADCode: validateAndConvert(BankADCode, "BankADCode", "string", false) || "",
//       UseDHLInvoice: validateAndConvert(UseDHLInvoice, "UseDHLInvoice", "uppercaseString", true, { valid: ["Y", "N"] }) || "Y",
//       SignatureName: validateAndConvert(SignatureName, "SignatureName", "string", true) || "Test Signer",
//       SignatureTitle: validateAndConvert(SignatureTitle, "SignatureTitle", "string", true) || "Manager",
//       ManufactureCountryCode: validateAndConvert(ManufactureCountryCode, "ManufactureCountryCode", "uppercaseString", true) || "IN",
//       ManufactureCountryName: validateAndConvert(ManufactureCountryName, "ManufactureCountryName", "uppercaseString", true) || "INDIA",
//       SerialNumber: validateAndConvert(SerialNumber, "SerialNumber", "string", true) || "12345",
//       FOBValue: validateAndConvert(FOBValue, "FOBValue", "string", true) || "10",
//       Discount: validateAndConvert(Discount, "Discount", "string", false) || "0",
//       Description: validateAndConvert(Description, "Description", "string", true) || "Sample Item",
//       Qty: validateAndConvert(Qty, "Qty", "string", true) || "1",
//       Weight: validateAndConvert(Weight, "Weight", "string", true) || "1",
//       HSCode: validateAndConvert(HSCode, "HSCode", "string", true) || "123456",
//       CommodityCode: validateAndConvert(CommodityCode, "CommodityCode", "string", false) || "",
//       CommodityType: validateAndConvert(CommodityType, "CommodityType", "string", true) || "GOODS",
//       InvoiceRatePerUnit: validateAndConvert(InvoiceRatePerUnit, "InvoiceRatePerUnit", "string", true) || "10",
//       ShipPieceUOM: validateAndConvert(ShipPieceUOM, "ShipPieceUOM", "string", true) || "KG",
//       ShipPieceCESS: validateAndConvert(ShipPieceCESS, "ShipPieceCESS", "string", false) || "0",
//       ShipPieceTaxableValue: validateAndConvert(ShipPieceTaxableValue, "ShipPieceTaxableValue", "string", true) || "10",
//       FreightCharge: validateAndConvert(FreightCharge, "FreightCharge", "string", false) || "0",
//       InsuranceCharge: validateAndConvert(InsuranceCharge, "InsuranceCharge", "string", false) || "0",
//       TotalIGST: validateAndConvert(TotalIGST, "TotalIGST", "string", false) || "0",
//       CessCharge: validateAndConvert(CessCharge, "CessCharge", "string", false) || "0",
//       ReverseCharge: validateAndConvert(ReverseCharge, "ReverseCharge", "string", false) || "0",
//       PayerGSTVAT: validateAndConvert(PayerGSTVAT, "PayerGSTVAT", "string", false) || "",
//       IsResponseRequired: validateAndConvert(IsResponseRequired, "IsResponseRequired", "uppercaseString", true, { valid: ["Y", "N"] }) || "Y",
//       LabelReq: validateAndConvert(LabelReq, "LabelReq", "uppercaseString", true, { valid: ["Y", "N"] }) || "Y",
//       SpecialService: validateAndConvert(SpecialService, "SpecialService", "string", false) || "",
//       InsuredAmount: validateAndConvert(InsuredAmount, "InsuredAmount", "string", false) || "0",
//       Invoicevalueinword: validateAndConvert(Invoicevalueinword, "Invoicevalueinword", "string", true) || "TEN",
//       Placeofsupply: validateAndConvert(Placeofsupply, "Placeofsupply", "uppercaseString", true) || "HYDERABAD",
//       dateofsupply: validateAndConvert(dateofsupply, "dateofsupply", "string", true) || "2025-06-17",
//       Shipperstatecode: validateAndConvert(Shipperstatecode, "Shipperstatecode", "string", true) || "TS",
//       ShipperstateName: validateAndConvert(ShipperstateName, "ShipperstateName", "uppercaseString", true) || "TELANGANA",
//       isIndemnityClauseRead: validateAndConvert(isIndemnityClauseRead, "isIndemnityClauseRead", "uppercaseString", true, { valid: ["YES", "NO"] }) || "YES",
//     };

//     // Log SOAP request arguments
//     console.log("SOAP Request Arguments:", JSON.stringify(args, null, 2));

//     // Create SOAP client
//     const client = await soap.createClientAsync(wsdlUrl);
//     console.log("SOAP Client Methods:", Object.keys(client));

//     // Log raw SOAP request and response
//     client.on("request", (xml) => {
//       console.log("Raw SOAP Request XML:", xml);
//     });
//     client.on("response", (xml) => {
//       console.log("Raw SOAP Response XML:", xml);
//     });
//     client.on("soapError", (err) => {
//       console.error("SOAP Client Error:", err);
//     });

//     // Make SOAP request
//     client.PostShipment_CSBV(args, (err, result) => {
//       if (err) {
//         console.error("SOAP DHL Error:", err);
//         const fault = err.root?.Envelope?.Body?.Fault || {};
//         const errorMessage = fault.detail?.ExceptionDetail?.Message || fault.faultstring || err.message || "Unknown SOAP error";
//         console.error("SOAP Fault Details:", JSON.stringify(fault, null, 2));
//         return res.status(500).json({ message: "SOAP Error", error: errorMessage });
//       }
//       console.log("✅ DHL Shipment Response:", JSON.stringify(result, null, 2));
//       res.json({ message: "Shipment created successfully", data: result });
//     });
//   } catch (error) {
//     console.error("🚨 Unexpected Server Error:", error);
//     res.status(500).json({ message: "Server Crash", error: error.message });
//   }
// };

// module.exports = {
//   createShippingQuote: exports.createShippingQuote,
//   createPickup: exports.createPickup,
//   trackShipment: exports.trackShipment,
//   createDHLShipment: exports.createDHLShipment,
// };


// router.post('/create-shipping-quote', async (req, res) => {
//   try {
//     const xml = buildSOAPQuoteXML(req.body); // Implement a similar function for quote XML
//     const response = await axios.post(
//       'https://api.india.express.dhl.com/DHLWCFService_V6/DHLService.svc',
//       xml,
//       {
//         headers: {
//           'Content-Type': 'text/xml;charset=UTF-8',
//           'SOAPAction': 'http://tempuri.org/IDHLService/GetQuote', // Adjust SOAP action
//           'Cookie': req.body.cookie || 'YOUR_COOKIE_HERE',
//         },
//       }
//     );
//     res.status(200).send(response.data);
//   } catch (err) {
//     console.error('DHL Quote error:', err?.response?.data || err.message);
//     res.status(500).json({ error: 'Failed to get DHL quote.' });
//   }
// });









