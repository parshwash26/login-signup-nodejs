const nodemailer = require("nodemailer");

const createTransporter = (service) => {
  const commonConfig = {
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  };

  let transporter;

  switch (service.toLowerCase()) {
    case "gmail":
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: commonConfig.auth,
      });
      break;
    case "yopmail":
      transporter = nodemailer.createTransport({
        host: "smtp.yopmail.com",
        port: 465,
        secure: true,
        auth: commonConfig.auth,
      });
      break;
    case "yahoo":
      transporter = nodemailer.createTransport({
        service: "yahoo",
        auth: commonConfig.auth,
      });
      break;
    case "outlook":
      transporter = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth: commonConfig.auth,
        tls: {
          ciphers: "SSLv3",
        },
      });
      break;
    default:
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_SECURE === "true",
        auth: commonConfig.auth,
      });
      break;
  }

  transporter.verify((error, success) => {
    if (error) {
      console.error("Error verifying transporter:", error);
    } else {
    }
  });

  return transporter;
};

module.exports = {
  createTransporter,
};
