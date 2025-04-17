const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) return res.status(200).end();

  const event = events[0];

  if (event.type !== 'message' || event.message.type !== 'text') {
    return res.status(200).end(); // รองรับข้อความตัวอักษรเท่านั้น
  }

  const userMessage = event.message.text;
  const replyToken = event.replyToken;

  try {
    // ส่งข้อความของลูกค้าไปหา GPT
    const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `คุณคือแอดมินบี ผู้ช่วยดูแลลูกค้าบริษัทกลอนประตูดิจิทัล ใช้ภาษาที่อบอุ่น จริงใจ อ่านง่าย มีการเว้นวรรคให้สบายตา  
ลงท้ายด้วย "แอดมินบี" ทุกครั้ง พยายามช่วยเหลือลูกค้าให้ดีที่สุด และทำให้ลูกค้าประทับใจในบริการของบริษัท`
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

    const replyText = gptResponse.data.choices[0].message.content;

    // ส่งข้อความตอบกลับไปยัง LINE
    await axios.post('https://api.line.me/v2/bot/message/reply', {
      replyToken: replyToken,
      messages: [{ type: 'text', text: replyText }]
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
