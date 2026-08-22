const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // CORS Headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ (chỉ dùng POST)' });
  }

  try {
    const {
      reporterEmail,
      recipientCopyEmail,
      reporterName,
      patientName,
      reportType,
      fileName,
      fileFormat,
      fileBase64
    } = req.body || {};

    const targetEmail = recipientCopyEmail || reporterEmail;
    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp địa chỉ email Dược sĩ / Học viên nhận bản sao báo cáo.'
      });
    }

    const senderEmail = process.env.GMAIL_USER || 'thuky.hdhct@gmail.com';
    const pass = process.env.GMAIL_APP_PASSWORD;

    // Soạn nội dung email HTML cho bản thực hành
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #004085; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">HỘI DƯỢC HỌC CẦN THƠ</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: bold; color: #ffdd57;">BÁO CÁO PHẢN ỨNG CÓ HẠI CỦA THUỐC (ADR) - PHIÊN BẢN HỌC THỰC HÀNH</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p>Xin chào Dược sĩ / Học viên <strong>${reporterName || 'học viên'}</strong>,</p>
          <p>Hệ thống Vercel vừa kết xuất và tự động gửi bản sao Báo cáo Phản ứng có hại của Thuốc (ADR) - Phiên bản Học Thực Hành.</p>
          
          <div style="background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="margin-top: 0; color: #856404;">Tóm tắt thông tin bài thực hành:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li><strong>Bệnh nhân thực hành:</strong> ${patientName || 'Không đề cập'}</li>
              <li><strong>Dạng báo cáo:</strong> ${reportType || 'Thực hành'}</li>
              <li><strong>Thời gian thực hiện:</strong> ${new Date().toLocaleString('vi-VN')}</li>
              <li><strong>Định dạng đính kèm:</strong> ${fileFormat ? fileFormat.toUpperCase() : 'PDF'}</li>
            </ul>
          </div>

          <p>Bản sao báo cáo đã được đóng gói đính kèm trong email này để Anh/Chị học viên lưu trữ phục vụ bài thực hành & học tập.</p>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666; text-align: center;">
            Hệ thống Báo cáo An toàn Thuốc - Hội Dược học Cần Thơ (Vercel Serverless)<br>
            Email gửi: <strong>${senderEmail}</strong>
          </p>
        </div>
      </div>
    `;

    // Chuẩn bị đính kèm file
    const attachments = [];
    if (fileBase64) {
      const cleanBase64 = fileBase64.replace(/^data:.*;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const attachmentName = fileName || `Bao_Cao_ADR_ThucHanh_${Date.now()}.${fileFormat === 'word' ? 'docx' : 'pdf'}`;
      
      attachments.push({
        filename: attachmentName,
        content: buffer,
        contentType: fileFormat === 'word' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'
      });
    }

    // Nếu chưa cài GMAIL_APP_PASSWORD trên Vercel Environment Variables
    if (!pass) {
      return res.status(200).json({
        success: true,
        simulation: true,
        message: `[Mô phỏng Vercel] Báo cáo đã kết xuất thành công! Để tự động gửi email thật từ ${senderEmail} tới ${targetEmail}, hãy vào Vercel Settings -> Environment Variables và thêm GMAIL_APP_PASSWORD.`
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: senderEmail, pass: pass }
    });

    const mailOptions = {
      from: `"Thư ký Hội Dược Học Cần Thơ" <${senderEmail}>`,
      to: targetEmail,
      subject: `[Bản sao thực hành] Báo cáo phản ứng có hại của thuốc (ADR) - ${reporterName || 'Học viên'}`,
      html: htmlBody,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: `Bản sao Báo cáo ADR thực hành đính kèm file đã được gửi thành công từ ${senderEmail} đến email: ${targetEmail}`
    });

  } catch (error) {
    console.error('❌ Vercel Function Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi gửi email trên Vercel: ' + error.message
    });
  }
};
