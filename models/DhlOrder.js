// // models/DhlOrder.js
// const mongoose = require('mongoose');

// const DhlOrderSchema = new mongoose.Schema({
// awbNo: { type: String, required: true },
//   billToPartyCompany: String,
//   mobileNumber: String,
//   invoicePath: String,
//   pdfData: Object,  // Storing the JSON data of the PDF
//   status: String,
// });

// module.exports = mongoose.model('DhlOrder', DhlOrderSchema);


// models/DhlOrder.js
const mongoose = require('mongoose');

const DhlOrderSchema = new mongoose.Schema({
  awbNo: { type: String, required: true },
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
  status: String,
}, { timestamps: true });

module.exports = mongoose.model('DhlOrder', DhlOrderSchema);

