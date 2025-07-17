
const mongoose = require('mongoose');

// const DhlOrderSchema = new mongoose.Schema({
//   awbNo: { type: String, required: true },
//   billToPartyCompany: String,
//   mobileNumber: String,
//   invoicePath: String,
//   shipmentPdfPath: String,
//   pdfData: {
//     invoicePdf: Object,
//     shipmentPdf: Object,
//   },
//   receiverName: String,
//   receiverPhone: String,
//   status: String,
// }, { timestamps: true });

const DhlOrderSchema = new mongoose.Schema({
  awbNo: String,
  billToPartyCompany: String,
  mobileNumber: String,
  invoicePath: String,
  shipmentPdfPath: String,
   pdfData: {
    invoicePdf: Object,
    shipmentPdf: Object,
  },
  receiverName: String,
  receiverPhone: String,
  receiverEmail: String,
  receiverAddress: String,
  receiverCity: String,
  receiverPostalCode: String,
  receiverStateCode: String,
  receiverCountryCode: String,
  subtotal: Number,
  freightCharge: Number,
  total: Number,
  currency: String,
  cartItems: [
    {
      name: String,
      price: Number,
      quantity: Number,
      sku: String,
    },
  ],
  status: String,
});

module.exports = mongoose.model('DhlOrder', DhlOrderSchema);

