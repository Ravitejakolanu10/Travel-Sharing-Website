import nodemailer from "nodemailer";

async function sendOtpViaEmail(userEmail, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // or another email service
        auth: {
            user: '',
            pass: 'cpqw urmt sgya lmvj'
        }
    });

    const mailOptions = {
        from: 'travelsharing01@gmail.com',
        to: userEmail,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('OTP sent successfully');
    } catch (error) {
        console.error('Error sending OTP:', error);
    }
}

// Example usage
const otp = Math.floor(100000 + Math.random()*900000);
sendOtpViaEmail('ravitejakolanu00@gmail.com', otp);
