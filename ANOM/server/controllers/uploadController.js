const { getProfile, upsertProfile } = require('../models/profileStore');
const { findById } = require('../models/userStore');
const { uploadProfilePhoto } = require('../services/objectStorageService');

/** Re-enable when IBM Cloud Object Storage credentials are configured. */
const PROFILE_PHOTO_UPLOAD_ENABLED = process.env.PROFILE_PHOTO_UPLOAD_ENABLED === 'true';

async function uploadProfilePhotoHandler(req, res) {
  if (!PROFILE_PHOTO_UPLOAD_ENABLED) {
    return res.status(503).json({
      success: false,
      message: 'Photo upload is coming soon. Add a Profile Image URL on your profile instead.',
    });
  }

  if (!req.file) {
    return res.status(422).json({ success: false, message: 'An image file is required.' });
  }

  try {
    const [uploaded, existing, user] = await Promise.all([
      uploadProfilePhoto(req.user.id, req.file),
      getProfile(req.user.id),
      findById(req.user.id),
    ]);
    const profile = await upsertProfile(req.user.id, {
      ...(existing || { name: user?.name || '', email: user?.email || '' }),
      photoUrl: uploaded.url,
    });
    return res.status(201).json({ success: true, url: uploaded.url, profile });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Unable to upload profile photo.' });
  }
}

async function deleteProfilePhotoHandler(req, res) {
  if (!PROFILE_PHOTO_UPLOAD_ENABLED) {
    return res.status(503).json({
      success: false,
      message: 'Photo upload is coming soon. Clear your Profile Image URL on your profile instead.',
    });
  }

  try {
    const existing = await getProfile(req.user.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }
    const profile = await upsertProfile(req.user.id, { ...existing, photoUrl: '' });
    return res.json({ success: true, profile });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { uploadProfilePhotoHandler, deleteProfilePhotoHandler };
