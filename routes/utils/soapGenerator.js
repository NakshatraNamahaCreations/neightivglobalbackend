// PATCHED DHL Shipment SOAP Request Generator
const axios = require('axios');
const { validationResult } = require('express-validator');
const xml2js = require('xml2js');
const fs = require('fs').promises;
require('dotenv').config();

const escapeXml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const generateSoapRequest = (data) => {
  const requiredFields = [
  'accountNumber', 'receiverName', 'receiverStreet', 'receiverCity', 'receiverZip', 'receiverCountry',
  'receiverEmail', 'weight', 'productCode', 'shipperName', 'shipperStreet', 'shipperCity', 'shipperZip',
  'shipperCountry', 'shipperEmail', 'customerReference', 'shipmentPurpose', 'termsOfTrade',
]


  const errors = [];
  for (const field of requiredFields) {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`Missing or empty required field: ${field}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:dhl="http://tempuri.org/">
      <soapenv:Header/>
      <soapenv:Body>
        <dhl:PostShipment_CSBV>
          <Shipmentpurpose>${escapeXml(data.shipmentPurpose)}</Shipmentpurpose>
          <ShipperAccNumber>${escapeXml(data.accountNumber)}</ShipperAccNumber>
          <ShippingPaymentType>${escapeXml(data.shippingPaymentType || 'S')}</ShippingPaymentType>
          <BillingAccNumber>${escapeXml(data.billingAccNumber || data.accountNumber)}</BillingAccNumber>

          <ConsigneeCompName>${escapeXml(data.receiverName)}</ConsigneeCompName>
          <ConsigneeAddLine1>${escapeXml(data.receiverStreet)}</ConsigneeAddLine1>
          <ConsigneeAddLine2>${escapeXml(data.receiverAddLine2 || '')}</ConsigneeAddLine2>
          <ConsigneeAddLine3>${escapeXml(data.receiverAddLine3 || '')}</ConsigneeAddLine3>
          <ConsigneeCity>${escapeXml(data.receiverCity)}</ConsigneeCity>
          <ConsigneeDivCode>${escapeXml(data.receiverDivCode || '001')}</ConsigneeDivCode>
          <PostalCode>${escapeXml(data.receiverZip)}</PostalCode>
          <ConsigneeCountryCode>${escapeXml(data.receiverCountry)}</ConsigneeCountryCode>
          <ConsigneeCountryName>${escapeXml(data.receiverCountryName || 'Germany')}</ConsigneeCountryName>
          <ConsigneeName>${escapeXml(data.receiverContactName || data.receiverName)}</ConsigneeName>
          <ConsigneePh>${escapeXml(data.receiverPhone || '0000000000')}</ConsigneePh>
          <ConsigneeEmail>${escapeXml(data.receiverEmail)}</ConsigneeEmail>

          <ShipNumberOfPieces>${escapeXml(data.numberOfPieces || '1')}</ShipNumberOfPieces>
          <ShipCurrencyCode>${escapeXml(data.shipCurrencyCode || 'INR')}</ShipCurrencyCode>
          <ShipPieceWt>${escapeXml(data.weight)}</ShipPieceWt>
          <ShipPieceDepth>${escapeXml(data.length || '1')}</ShipPieceDepth>
          <ShipPieceWidth>${escapeXml(data.width || '1')}</ShipPieceWidth>
          <ShipPieceHeight>${escapeXml(data.height || '1')}</ShipPieceHeight>
          <ShipGlobalProductCode>${escapeXml(data.productCode)}</ShipGlobalProductCode>
          <ShipLocalProductCode>${escapeXml(data.localProductCode || data.productCode)}</ShipLocalProductCode>
          <ShipContents>${escapeXml(data.shipContents || 'General Goods')}</ShipContents>

          <ShipperCompName>${escapeXml(data.shipperName)}</ShipperCompName>
          <ShipperAddress1>${escapeXml(data.shipperStreet)}</ShipperAddress1>
          <ShipperAddress2>${escapeXml(data.shipperAddLine2 || '')}</ShipperAddress2>
          <ShipperAddress3>${escapeXml(data.shipperAddLine3 || '')}</ShipperAddress3>
          <ShipperCountryCode>${escapeXml(data.shipperCountry)}</ShipperCountryCode>
          <ShipperCountryName>${escapeXml(data.shipperCountryName || 'Germany')}</ShipperCountryName>
          <ShipperCity>${escapeXml(data.shipperCity)}</ShipperCity>
          <ShipperPostalCode>${escapeXml(data.shipperZip)}</ShipperPostalCode>
          <ShipperPhoneNumber>${escapeXml(data.shipperPhone || '0000000000')}</ShipperPhoneNumber>

          <SiteId>${escapeXml(process.env.DHL_SITE_ID)}</SiteId>
          <Password>${escapeXml(process.env.DHL_PASSWORD)}</Password>

          <ShipperName>${escapeXml(data.shipperContactName || data.shipperName)}</ShipperName>
          <ShipperRef>${escapeXml(data.customerReference)}</ShipperRef>
          <TermsOfTrade>${escapeXml(data.termsOfTrade)}</TermsOfTrade>

          <GSTIN>${escapeXml(data.gstin || '27AAQCS4259Q1Z0')}</GSTIN>
          <GSTInvNo>${escapeXml(data.GSTInvNo || 'INV12345')}</GSTInvNo>
          <GSTInvNoDate>${escapeXml(data.GSTInvNoDate || '2024-01-01')}</GSTInvNoDate>

          <SignatureName>${escapeXml(data.SignatureName || 'Neightiv Global')}</SignatureName>
          <SignatureTitle>${escapeXml(data.SignatureTitle || 'Admin')}</SignatureTitle>

          <Exporter_CompanyName>${escapeXml(data.Exporter_CompanyName || 'Neightiv Global')}</Exporter_CompanyName>
          <Exporter_AddressLine1>${escapeXml(data.Exporter_AddressLine1 || 'Line 1')}</Exporter_AddressLine1>
          <Exporter_AddressLine2>${escapeXml(data.Exporter_AddressLine2 || '')}</Exporter_AddressLine2>
          <Exporter_City>${escapeXml(data.Exporter_City || 'Berlin')}</Exporter_City>
          <Exporter_DivisionCode>${escapeXml(data.Exporter_DivisionCode || '001')}</Exporter_DivisionCode>
          <Exporter_PostalCode>${escapeXml(data.Exporter_PostalCode || '10115')}</Exporter_PostalCode>
          <Exporter_CountryCode>${escapeXml(data.Exporter_CountryCode || 'DE')}</Exporter_CountryCode>
          <Exporter_CountryName>${escapeXml(data.Exporter_CountryName || 'Germany')}</Exporter_CountryName>
          <Exporter_PersonName>${escapeXml(data.Exporter_PersonName || 'John Doe')}</Exporter_PersonName>
          <Exporter_PhoneNumber>${escapeXml(data.Exporter_PhoneNumber || '9999999999')}</Exporter_PhoneNumber>
          <Exporter_Email>${escapeXml(data.Exporter_Email || 'exporter@example.com')}</Exporter_Email>

          <OrderNumber>${escapeXml(data.OrderNumber || 'ORD12345')}</OrderNumber>
          <OrderDate>${escapeXml(data.OrderDate || '2024-01-01')}</OrderDate>

          <Description>${escapeXml(data.description || 'General Goods')}</Description>
          <Qty>${escapeXml(data.quantity || '1')}</Qty>
          <Weight>${escapeXml(data.weight)}</Weight>
          <HSCode>${escapeXml(data.hsCode || '85234920')}</HSCode>
          <CommodityCode>${escapeXml(data.commodityCode || '123456')}</CommodityCode>
          <ShipPieceUOM>${escapeXml(data.shipPieceUOM || 'CM')}</ShipPieceUOM>

          <IsResponseRequired>${escapeXml(data.isResponseRequired || 'Y')}</IsResponseRequired>
          <LabelReq>${escapeXml(data.labelReq || 'Y')}</LabelReq>
        </dhl:PostShipment_CSBV>
      </soapenv:Body>
    </soapenv:Envelope>
  `;
};

module.exports = { generateSoapRequest };
