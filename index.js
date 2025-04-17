const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) return res.status(200).end();

  const replyToken = events[0].replyToken;
  const userMessage = events[0].message?.text;

  // ถ้าไม่ใช่ข้อความ (เช่น เป็นรูป) ให้ตอบกลับว่า "ขออภัย ระบบรองรับเฉพาะข้อความนะคะ"
  if (!userMessage) {
    await axios.post('https://api.line.me/v2/bot/message/reply', {
      replyToken: replyToken,
      messages: [{
        type: 'text',
        text: "ขออภัยค่ะ ตอนนี้ระบบยังรองรับเฉพาะข้อความเท่านั้น หากต้องการสอบถามข้อมูล รบกวนพิมพ์ข้อความเข้ามาได้นะคะ"
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return res.status(200).end();
  }

  try {
    const gptReply = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "คุณคือแอดมินของร้าน ISQ Digital Door Lock โปรดตอบคำถามลูกค้าให้สุภาพ ชัดเจน กระชับ และช่วยให้ลูกค้าตัดสินใจซื้อได้ง่ายขึ้น หากคำถามไม่เกี่ยวกับสินค้า ให้ตอบอย่างสุภาพว่าไม่สามารถช่วยในเรื่องนั้นได้"
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const replyMessage = gptReply.data.choices[0].message.content;

    await axios.post('https://api.line.me/v2/bot/message/reply', {
      replyToken: replyToken,
      messages: [{ type: 'text', text: replyMessage }]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    res.status(200).end();
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).end();
  }
});

app.get("/", (req, res) => {
  res.send("LINE GPT Chatbot is running.");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
