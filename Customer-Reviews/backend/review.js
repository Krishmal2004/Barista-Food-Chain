import nodemailer from 'nodemailer';

export function Review(supabase, app) {
    
    // Setup Email Sending
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });

    app.post('/api/reviews', async (req, res) => {
        const { branch_id, user_name, user_email, rating, review_text, platform } = req.body;

        // Basic Validation
        if (!branch_id || !rating || !review_text) {
            return res.status(400).json({ error: 'branch_id, rating, and review_text are required.' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
        }

        try {
            const { data, error } = await supabase
                .from('qr_reviews')
                .insert([
                    { 
                        branch_id, 
                        user_name: user_name || null, 
                        user_email: user_email || null, 
                        rating, 
                        review_text, 
                        platform: platform || 'Web' 
                    }
                ])
                .select();

            if (error) {
                console.error('Supabase Insert Error:', error);
                return res.status(500).json({ error: 'Failed to save review to database.' });
            }

            if (user_email) {
                try {
                    const mailOptions = {
                        from: `"Barista Coffee Chain" <${process.env.EMAIL_USER}>`,
                        to: user_email,
                        subject: 'Thank You for Your Feedback! ☕',
                        html: `
                            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; color: #333;">
                                <h2 style="color: #c27a3e;">Hi ${user_name || 'Coffee Lover'},</h2>
                                <p>Thank you so much for taking the time to leave a <strong>${rating}-star</strong> review for our <strong>${branch_id}</strong> branch!</p>
                                <p>Your feedback: <em>"${review_text}"</em></p>
                                <p>We truly value your input as it helps us craft the perfect coffee experience for you.</p>
                                <p>Hope to see you again soon!</p>
                                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                                <p style="font-size: 12px; color: #888;">Best regards,<br>The Barista Coffee Chain Team</p>
                            </div>
                        `
                    };

                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) {
                            console.error('Failed to send thank you email:', err);
                        } else {
                            console.log('Thank you email sent successfully to:', user_email);
                        }
                    });
                } catch (emailErr) {
                    console.error('Email preparation error:', emailErr);
                }
            }

            return res.status(201).json({ 
                message: 'Review submitted successfully!', 
                review: data[0] 
            });

        } catch (err) {
            console.error('Server Error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    });
};