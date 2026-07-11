import api from './client';
export const getMeetings = () => api.get('/meetings').then((r) => r.data);
export const createMeeting = (data) => api.post('/meetings/create', data).then((r) => r.data);
export const acceptMeeting = (id) => api.put(`/meetings/accept/${id}`).then((r) => r.data);
export const rejectMeeting = (id) => api.put(`/meetings/reject/${id}`).then((r) => r.data);
export const deleteMeeting = (id) => api.delete(`/meetings/${id}`).then((r) => r.data);
