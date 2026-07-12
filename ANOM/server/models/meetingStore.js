'use strict';

const { randomUUID } = require('crypto');
const { cloudant, MEETINGS_DB } = require('../config/cloudant');

const documentId = (id) => `meeting:${id}`;
const clean = ({ _id, _rev, type, ...meeting }) => ({ id: _id.replace(/^meeting:/, ''), ...meeting });

async function createMeeting({ requesterId, partnerId, date, time, venue, title, description }) {
  const id = randomUUID();
  const document = {
    _id: documentId(id), type: 'meeting', requesterId, partnerId, date, time, venue,
    status: 'pending', createdAt: new Date().toISOString(),
    ...(title && { title }),
    ...(description && { description })
  };
  await cloudant.putDocument({ db: MEETINGS_DB, docId: document._id, document });
  return clean(document);
}

async function listMeetings(userId) {
  try {
    const [requested, invited] = await Promise.all([
      cloudant.postFind({ db: MEETINGS_DB, selector: { type: 'meeting', requesterId: userId }, limit: 500 }),
      cloudant.postFind({ db: MEETINGS_DB, selector: { type: 'meeting', partnerId: userId }, limit: 500 }),
    ]);
    return [...(requested.result.docs || []), ...(invited.result.docs || [])]
      .map(clean)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  } catch (error) {
    console.error('[Cloudant]', error.message);
    return [];
  }
}

async function getMeeting(id) {
  const response = await cloudant.getDocument({ db: MEETINGS_DB, docId: documentId(id) });
  return { raw: response.result, meeting: clean(response.result) };
}

async function updateStatus(id, status) {
  const { raw } = await getMeeting(id);
  const document = { ...raw, status, updatedAt: new Date().toISOString() };
  await cloudant.putDocument({ db: MEETINGS_DB, docId: raw._id, document });
  return clean(document);
}

async function deleteMeeting(id) {
  const { raw } = await getMeeting(id);
  await cloudant.deleteDocument({ db: MEETINGS_DB, docId: raw._id, rev: raw._rev });
}

module.exports = { createMeeting, listMeetings, getMeeting, updateStatus, deleteMeeting };
