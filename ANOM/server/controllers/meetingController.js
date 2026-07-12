'use strict';

const Joi = require('joi');
const { areUsersMatched } = require('../models/interestStore');
const store = require('../models/meetingStore');
const { createNotification } = require('../models/notificationStore');
const { getProfile } = require('../models/profileStore');
const { ioInstance } = require('../socket');

const idSchema = Joi.string().guid({ version: ['uuidv4'] }).required();
const createSchema = Joi.object({
  partnerId: Joi.string().required(),
  date: Joi.date().iso().required(),
  time: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
  venue: Joi.string().trim().max(200).required(),
  title: Joi.string().trim().max(200).allow(''),
  description: Joi.string().trim().max(1000).allow(''),
});

function validateId(req, res) {
  const { error, value } = idSchema.validate(req.params.id);
  if (error) { res.status(422).json({ success: false, message: 'Invalid meeting ID.' }); return null; }
  return value;
}
function isParticipant(meeting, userId) { return meeting.requesterId === userId || meeting.partnerId === userId; }
function notFound(err, res) { if (err.status === 404) { res.status(404).json({ success: false, message: 'Meeting not found.' }); return true; } return false; }

async function createMeetingNotification(meeting, type, actorId) {
  const actorProfile = await getProfile(actorId);
  const actorName = actorProfile?.name || 'Someone';
  const recipientId = meeting.requesterId === actorId ? meeting.partnerId : meeting.requesterId;
  
  let title;
  let message;
  switch (type) {
    case 'meeting_request':
      title = 'Meeting Request';
      message = `${actorName} requested a meeting on ${meeting.date} at ${meeting.time} at ${meeting.venue}`;
      break;
    case 'meeting_accepted':
      title = 'Meeting Accepted';
      message = `${actorName} accepted your meeting on ${meeting.date} at ${meeting.time}`;
      break;
    case 'meeting_rejected':
      title = 'Meeting Rejected';
      message = `${actorName} rejected your meeting request`;
      break;
    case 'meeting_cancelled':
      title = 'Meeting Cancelled';
      message = `${actorName} cancelled the meeting`;
      break;
    default:
      title = 'Meeting Update';
      message = `${actorName} updated the meeting`;
  }

  const notification = await createNotification({
    recipientUserId: recipientId,
    senderUserId: actorId,
    type,
    title,
    message
  });
  if (ioInstance) {
    ioInstance.to(`user:${recipientId}`).emit('notification:new', notification);
  }
  return notification;
}

async function create(req, res) {
  const payload = { ...req.body, partnerId: req.body.partnerId || req.body.matchId, venue: req.body.venue || req.body.location };
  const { error, value } = createSchema.validate(payload);
  if (error) return res.status(422).json({ success: false, message: error.details[0].message });
  if (value.partnerId === req.user.id) return res.status(400).json({ success: false, message: 'You cannot schedule a meeting with yourself.' });
  if (!(await areUsersMatched(req.user.id, value.partnerId))) return res.status(403).json({ success: false, message: 'Only mutual matches can schedule a meeting.' });
  const meeting = await store.createMeeting({ requesterId: req.user.id, ...value });
  await createMeetingNotification(meeting, 'meeting_request', req.user.id);
  return res.status(201).json({ success: true, meeting });
}

async function list(req, res) {
  try {
    const meetings = await store.listMeetings(req.user.id);
    return res.json({ success: true, meetings });
  } catch (error) {
    console.error('[Cloudant]', error.message);
    return res.status(200).json({ success: true, meetings: [] });
  }
}

async function accept(req, res) {
  const id = validateId(req, res); if (!id) return;
  try {
    const { meeting } = await store.getMeeting(id);
    if (meeting.partnerId !== req.user.id) return res.status(403).json({ success: false, message: 'Only the invited match can accept this meeting.' });
    if (meeting.status !== 'pending') return res.status(409).json({ success: false, message: 'This meeting request has already been handled.' });
    const updatedMeeting = await store.updateStatus(id, 'accepted');
    await createMeetingNotification(updatedMeeting, 'meeting_accepted', req.user.id);
    return res.json({ success: true, meeting: updatedMeeting });
  } catch (err) { if (!notFound(err, res)) throw err; }
}

async function reject(req, res) {
  const id = validateId(req, res); if (!id) return;
  try {
    const { meeting } = await store.getMeeting(id);
    if (meeting.partnerId !== req.user.id) return res.status(403).json({ success: false, message: 'Only the invited match can reject this meeting.' });
    if (meeting.status !== 'pending') return res.status(409).json({ success: false, message: 'This meeting request has already been handled.' });
    const updatedMeeting = await store.updateStatus(id, 'rejected');
    await createMeetingNotification(updatedMeeting, 'meeting_rejected', req.user.id);
    return res.json({ success: true, meeting: updatedMeeting });
  } catch (err) { if (!notFound(err, res)) throw err; }
}

async function remove(req, res) {
  const id = validateId(req, res); if (!id) return;
  try {
    const { meeting } = await store.getMeeting(id);
    if (!isParticipant(meeting, req.user.id)) return res.status(403).json({ success: false, message: 'You cannot cancel this meeting.' });
    await store.deleteMeeting(id);
    await createMeetingNotification(meeting, 'meeting_cancelled', req.user.id);
    return res.json({ success: true, message: 'Meeting cancelled.' });
  } catch (err) { if (!notFound(err, res)) throw err; }
}

module.exports = { create, list, accept, reject, remove };
