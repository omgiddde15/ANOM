import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUser } from '../api/users';
import { getCompatibilityExplanation, analyzeProfile, improveBio, getFirstMessage } from '../api/ai';
import { useAuth } from '../context/auth';
import { AIInsightCard, LoadingCard, ErrorCard } from '../components/ai/AIInsightCard';
import DatePlannerModal from '../components/ai/DatePlannerModal';
import { resolveProfileImageUrl } from '../lib/profileImage';
import { toast } from '../lib/toast';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-10 w-10 rounded-full border-4 border-indigo-300 border-t-indigo-600 animate-spin" />
    </div>
  );
}

// Compatibility Score Card
function CompatibilityCard({ currentUserId, profileId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getCompatibilityExplanation(profileId);
      if (res?.success) {
        setData(res);
      } else {
        setError(res?.message || 'Failed to load compatibility');
      }
    } catch (err) {
      setError(err?.message || 'Error loading compatibility');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (!currentUserId || !profileId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [currentUserId, profileId, loadData]);

  if (loading) return <LoadingCard title="Match Explanation" icon="❤️" />;
  if (error) return <ErrorCard title="Match Explanation" icon="❤️" error={error} onRetry={loadData} />;
  if (!data) return null;

  return (
    <AIInsightCard title="Match Explanation" icon="❤️">
      <div className="space-y-5">
        {/* Compatibility Score */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 p-4 ring-1 ring-indigo-200">
          <h3 className="text-sm font-semibold text-indigo-900 mb-3">❤️ Compatibility Score</h3>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-indigo-600">{data.score}%</div>
            <div className="flex-1 h-4 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                style={{ width: `${data.score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Personality Match */}
        {data.explanation && data.explanation.length > 0 && (
          <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">🧠 Personality Match</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              {data.explanation.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Shared Interests / Strengths */}
        {data.strengths && data.strengths.length > 0 && (
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <h3 className="text-sm font-semibold text-emerald-900 mb-2">🎯 Strengths</h3>
            <ul className="space-y-1 text-sm text-emerald-800">
              {data.strengths.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-600">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conversation Tips / Relationship Tips */}
        {data.relationshipTips && data.relationshipTips.length > 0 && (
          <div className="rounded-2xl bg-purple-50 p-4 ring-1 ring-purple-200">
            <h3 className="text-sm font-semibold text-purple-900 mb-2">⚡ Conversation Tips</h3>
            <ul className="space-y-1 text-sm text-purple-800">
              {data.relationshipTips.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-purple-600">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Possible Differences / Challenges */}
        {data.challenges && data.challenges.length > 0 && (
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">🚩 Possible Differences</h3>
            <ul className="space-y-1 text-sm text-amber-800">
              {data.challenges.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-600">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AIInsightCard>
  );
}

// Personality Analysis Card
function PersonalityCard({ profile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await analyzeProfile(profile.bio || '', profile.interests || []);
      if (res?.success) {
        setData(res);
      } else {
        setError(res?.message || 'Failed to analyze personality');
      }
    } catch (err) {
      setError(err?.message || 'Error analyzing personality');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    loadData();
  }, [profile, loadData]);

  if (loading) return <LoadingCard title="Personality Analysis" icon="🧠" />;
  if (error) return <ErrorCard title="Personality Analysis" icon="🧠" error={error} onRetry={loadData} />;
  if (!data) return null;

  return (
    <AIInsightCard title="Personality Analysis" icon="🧠">
      <div className="space-y-4">
        {data.personality && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Personality Type</p>
            <p className="text-sm font-medium text-slate-900">{data.personality}</p>
          </div>
        )}

        {data.communicationStyle && (
          <div className="rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-200">
            <p className="text-xs font-semibold text-blue-900 mb-1">💬 Communication Style</p>
            <p className="text-sm text-blue-800">{data.communicationStyle}</p>
          </div>
        )}

        {data.strengths && (
          <div className="rounded-2xl bg-green-50 p-3 ring-1 ring-green-200">
            <p className="text-xs font-semibold text-green-900 mb-1">⭐ Strengths</p>
            <p className="text-sm text-green-800">{data.strengths}</p>
          </div>
        )}

        {data.relationshipGoals && (
          <div className="rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-200">
            <p className="text-xs font-semibold text-rose-900 mb-1">💕 Relationship Goals</p>
            <p className="text-sm text-rose-800">{data.relationshipGoals}</p>
          </div>
        )}

        {data.summary && (
          <div className="rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-200">
            <p className="text-xs font-semibold text-indigo-900 mb-1">📝 Summary</p>
            <p className="text-sm text-indigo-800">{data.summary}</p>
          </div>
        )}
      </div>
    </AIInsightCard>
  );
}

// AI Bio Card
function AIBioCard({ profile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await improveBio(profile.bio || '', profile.interests || []);
      if (res?.success) {
        setData(res);
      } else {
        setError(res?.message || 'Failed to improve bio');
      }
    } catch (err) {
      setError(err?.message || 'Error improving bio');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    loadData();
  }, [profile, loadData]);

  useEffect(() => () => clearTimeout(copyTimeoutRef.current), []);

  const handleCopy = () => {
    navigator.clipboard?.writeText(data?.improvedBio || '');
    setCopied(true);
    toast('Copied to clipboard!');
    clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingCard title="AI Bio" icon="✨" />;
  if (error) return <ErrorCard title="AI Bio" icon="✨" error={error} onRetry={loadData} />;
  if (!data?.improvedBio) return null;

  return (
    <AIInsightCard title="AI Bio" icon="✨">
      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 mb-4">
        <p className="text-sm text-slate-800 leading-relaxed">{data.improvedBio}</p>
      </div>
      <button
        onClick={handleCopy}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
      >
        {copied ? '✓ Copied' : '📋 Copy Bio'}
      </button>
    </AIInsightCard>
  );
}

// First Message Card
function FirstMessageCard({ currentUserId, profileId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getFirstMessage(currentUserId, profileId);
      if (res?.success) {
        setData(res);
      } else {
        setError(res?.message || 'Failed to generate message');
      }
    } catch (err) {
      setError(err?.message || 'Error generating message');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, profileId]);

  useEffect(() => {
    if (!currentUserId || !profileId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [currentUserId, profileId, loadData]);

  useEffect(() => () => clearTimeout(copyTimeoutRef.current), []);

  const handleCopy = () => {
    navigator.clipboard?.writeText(data?.firstMessage || data?.message || '');
    setCopied(true);
    toast('Copied to clipboard!');
    clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const messageText = data?.firstMessage || data?.message;
  if (loading) return <LoadingCard title="Conversation Starter" icon="💬" />;
  if (error) return <ErrorCard title="Conversation Starter" icon="💬" error={error} onRetry={loadData} />;
  if (!messageText) return null;

  return (
    <AIInsightCard title="Conversation Starter" icon="💬">
      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 mb-4">
        <p className="text-sm text-slate-800 leading-relaxed">{messageText}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={loadData}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          🔄 Regenerate
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
    </AIInsightCard>
  );
}

// Date Planner Card
function DatePlannerCard({ currentUserId, profileId, matchName, onOpenModal }) {
  return (
    <AIInsightCard title="AI Date Planner" icon="📅">
      <p className="text-sm text-slate-600 mb-4">
        Get personalized date ideas for you and {matchName}!
      </p>
      <button
        onClick={onOpenModal}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
      >
        Generate Date Ideas
      </button>
    </AIInsightCard>
  );
}

function UserProfilePhoto({ profile }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = resolveProfileImageUrl(profile);

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={profile.name}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center text-6xl font-bold text-indigo-600">
      {profile.name?.slice(0, 1).toUpperCase() || '?'}
    </div>
  );
}

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [datePlannerOpen, setDatePlannerOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        const res = await getUser(id);
        if (!mounted) return;
        if (res?.success && res?.user) {
          setProfile(res.user);
          setError('');
        } else {
          setError(res?.message || 'User not found.');
        }
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Unable to load profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleUseForMeeting = (plan) => {
    // Store in session storage to pass to MeetingSchedulerPage
    sessionStorage.setItem('meetingPrefill', JSON.stringify({
      venue: plan.location,
      title: plan.activityName,
      description: plan.description,
      partnerId: id
    }));
    navigate('/meetings');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-semibold text-red-900">Profile not available</h1>
          <p className="mt-3 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            ← Back to Discover
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const currentUserId = currentUser?.id;

  return (
    <>
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to Discover
          </button>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Profile Card - Left Column */}
            <div className="lg:col-span-1">
              <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sticky top-10">
                {/* Header with Profile Picture and Basic Info */}
                <div className="flex flex-col items-center gap-4">
                  {/* Profile Picture */}
                  <div className="relative h-48 w-48 overflow-hidden rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 shadow-md ring-4 ring-indigo-100">
                    <UserProfilePhoto profile={profile} />
                  </div>

                  {/* Basic Info */}
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900">{profile.name || 'Unknown'}</h1>
                    {profile.profession && (
                      <p className="mt-2 text-lg font-semibold text-indigo-600">{profile.profession}</p>
                    )}
                    {profile.city && (
                      <p className="mt-1 text-slate-500">{profile.city}</p>
                    )}
                  </div>
                </div>

                {/* Bio Section */}
                {profile.bio && (
                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <h2 className="text-lg font-semibold text-slate-900">About</h2>
                    <p className="mt-3 leading-relaxed text-slate-700">{profile.bio}</p>
                  </div>
                )}

                {/* Interests Section */}
                {profile.interests && profile.interests.length > 0 && (
                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <h2 className="text-lg font-semibold text-slate-900">Interests</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.interests.map((interest) => (
                        <span
                          key={interest}
                          className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Insights - Right Columns */}
            <div className="lg:col-span-2 space-y-6">
              {currentUserId ? (
                <>
                  <CompatibilityCard
                    currentUserId={currentUserId}
                    profileId={profile.id}
                  />
                  <PersonalityCard profile={profile} />
                  <AIBioCard profile={profile} />
                  <FirstMessageCard
                    currentUserId={currentUserId}
                    profileId={profile.id}
                  />
                  <DatePlannerCard 
                    currentUserId={currentUserId} 
                    profileId={profile.id}
                    matchName={profile.name || 'your match'}
                    onOpenModal={() => setDatePlannerOpen(true)}
                  />
                </>
              ) : (
                <div className="rounded-3xl bg-blue-50 p-6 ring-1 ring-blue-200 text-center">
                  <p className="text-sm text-blue-800">
                    Log in to see AI-powered insights about this profile
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <DatePlannerModal 
        open={datePlannerOpen}
        onClose={() => setDatePlannerOpen(false)}
        currentUserId={currentUserId}
        profileId={profile.id}
        matchName={profile.name || 'your match'}
        onUseForMeeting={handleUseForMeeting}
      />
    </>
  );
}
