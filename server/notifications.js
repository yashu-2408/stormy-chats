const axios = require('axios');

/**
 * Sends push notification to an Expo Push Token
 */
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken[')) {
    return;
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      timeout: 5000
    });
  } catch (error) {
    console.error('Error sending push notification:', error.message);
  }
}

module.exports = { sendPushNotification };
