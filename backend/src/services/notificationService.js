const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

async function createNotification({
  io,
  userId,
  type,
  title,
  message,
  link = '',
  metadata = {}
}) {
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    link,
    metadata
  });

  const payload = {
    _id: notification._id,
    user: notification.user,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link,
    metadata: notification.metadata,
    isRead: notification.isRead,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt
  };

  if (io) {
    io.to(String(userId)).emit('notification:new', payload);
  }

  return payload;
}

async function createNotificationWithOptionalEmail({
  io,
  userId,
  type,
  title,
  message,
  link = '',
  metadata = {},
  sendEmailToUser = false,
  emailSubject,
  emailHtml
}) {
  const payload = await createNotification({
    io,
    userId,
    type,
    title,
    message,
    link,
    metadata
  });

  if (sendEmailToUser) {
    try {
      const user = await User.findById(userId).select('email').lean();
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: emailSubject || title,
          html: emailHtml || `<p>${message}</p>`
        });
      }
    } catch (err) {
      console.error('Notification email send failed:', err.message);
    }
  }

  return payload;
}

module.exports = {
  createNotification,
  createNotificationWithOptionalEmail
};
