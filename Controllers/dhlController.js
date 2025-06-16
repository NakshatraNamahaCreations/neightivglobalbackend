// controllers/dhlController.js
const soap = require("soap");

const wsdlUrl = "https://api.india.express.dhl.com/DHLWCFService_V6/DHLService.svc?wsdl";

exports.createDHLShipment = async (req, res) => {
  try {
    console.log("Received shipment data:", req.body);
    const client = await soap.createClientAsync(wsdlUrl);

    const description = client.describe();
    console.log("🧩 Full WSDL structure:", JSON.stringify(description, null, 2));

    // Dynamically locate first service > port > method
    const [serviceName] = Object.keys(description);
    const [portName] = Object.keys(description[serviceName]);
    const [methodName] = Object.keys(description[serviceName][portName]);

    if (!methodName) {
      return res.status(500).json({ message: "❌ No method found in any service/port." });
    }

    console.log(`✅ Auto-located: ${serviceName} > ${portName} > ${methodName}`);

    const service = client[serviceName][portName];
    const args = {
      SiteID: "neightivindIN",
      Password: "K@4H^6yH#2rCs$4|",
      ShipmentDetails: {
        ShipperName: "Neightiv India Private Limited",
        ShipperAddress1: "612, Suguna Upper Crest Apartment",
        ShipperAddress2: "Bangarappa Nagar Main Road, Gattigere",
        ShipperAddress3: "Rajarajeshwari Nagar",
        ShipperCity: "Bangalore",
        ShipperStateCode: "29",
        ShipperPostalCode: "560098",
        ShipperCountryCode: "IN",
        ShipperPhoneNumber: "9999999999",
        ConsigneeName: req.body.receiverName,
        ConsigneeAddress1: req.body.receiverAddress,
        ConsigneeCity: req.body.receiverCity,
        ConsigneeStateCode: req.body.receiverStateCode,
        ConsigneePostalCode: req.body.receiverPostalCode,
        ConsigneeCountryCode: "IN",
        ConsigneePhoneNumber: req.body.receiverPhone,
        Weight: req.body.weight,
        Pieces: "1",
        DimensionLength: req.body.length,
        DimensionWidth: req.body.width,
        DimensionHeight: req.body.height,
        ProductCode: "D",
        PaymentType: "S",
        DeclaredValue: "1000",
        DeclaredCurrency: "INR",
        AccountNumber: "537986109",
        IsDutiable: "N",
        LabelReq: "Y",
        UseDHLInvoice: "Y",
        IsResponseRequired: "Y",
        ReasonforExport: "Sale",
        Description: "Sample Goods"
      }
    };

    service[methodName](args, (err, result) => {
      if (err) {
        console.error("SOAP DHL Error:", err);
        return res.status(500).json({ message: "SOAP Error", error: err });
      }

      console.log("✅ DHL Response:", result);
      res.json({ message: "Shipment created successfully", data: result });
    });
  } catch (error) {
    console.error("🚨 Server Error:", error);
    res.status(500).json({ message: "Unexpected Error", error });
  }
};
