const { createClient } = require('@supabase/supabase-js');

// Rate limiting map (in-memory, resets on cold start)
const rateLimitMap = new Map();

// Enhanced profanity filter (German)
const profanityList = [
    'arsch', 'idiot', 'dumm', 'scheiße', 'fick', 'wichser', 
    'fotze', 'hure', 'bastard', 'sau', 'piss', 'arschloch'
];

// Spam detection patterns
const spamPatterns = [
    /(.)\1{4,}/gi, // Repeated characters
    /https?:\/\//gi, // URLs
    /[A-Z]{10,}/g, // Too many caps
    /(buy|click|free|win|prize|congratulations)/gi
];

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Methode nicht erlaubt',
            message: 'Nur POST-Anfragen sind erlaubt'
        });
    }

    try {
        // Get environment variables
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing environment variables');
            return res.status(500).json({ 
                error: 'Server-Konfigurationsfehler',
                message: 'Bitte überprüfen Sie die Umgebungsvariablen'
            });
        }

        // Initialize Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get message and metadata from request body
        const { message, metadata } = req.body;

        // Validate message
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ 
                error: 'Nachricht darf nicht leer sein!',
                code: 'EMPTY_MESSAGE'
            });
        }

        const trimmedMessage = message.trim();

        if (trimmedMessage.length === 0) {
            return res.status(400).json({ 
                error: 'Nachricht darf nicht leer sein!',
                code: 'EMPTY_MESSAGE'
            });
        }

        if (trimmedMessage.length > 300) {
            return res.status(400).json({ 
                error: 'Nachricht darf maximal 300 Zeichen lang sein!',
                code: 'MESSAGE_TOO_LONG'
            });
        }

        if (trimmedMessage.length < 5) {
            return res.status(400).json({ 
                error: 'Nachricht muss mindestens 5 Zeichen lang sein!',
                code: 'MESSAGE_TOO_SHORT'
            });
        }

        // Profanity filter
        const lowerMessage = trimmedMessage.toLowerCase();
        for (const word of profanityList) {
            if (lowerMessage.includes(word)) {
                return res.status(400).json({ 
                    error: 'Ihre Nachricht enthält unangemessene Inhalte!',
                    code: 'PROFANITY_DETECTED'
                });
            }
        }

        // Spam detection
        let isSpam = false;
        for (const pattern of spamPatterns) {
            if (pattern.test(trimmedMessage)) {
                isSpam = true;
                break;
            }
        }

        // Get client IP
        const clientIp = req.headers['x-forwarded-for'] || 
                        req.headers['x-real-ip'] || 
                        req.socket.remoteAddress || 
                        'unknown';
        
        // Create IP hash (simple hash for privacy)
        const ipHash = simpleHash(clientIp);

        // Check if IP is blocked
        const { data: blockedIp } = await supabase
            .from('blocked_ips')
            .select('*')
            .eq('ip_hash', ipHash)
            .single();

        if (blockedIp) {
            // Check if block has expired
            if (blockedIp.blocked_until && new Date(blockedIp.blocked_until) < new Date()) {
                // Remove expired block
                await supabase
                    .from('blocked_ips')
                    .delete()
                    .eq('ip_hash', ipHash);
            } else {
                return res.status(403).json({ 
                    error: 'Ihre IP-Adresse wurde gesperrt!',
                    code: 'IP_BLOCKED',
                    reason: blockedIp.reason
                });
            }
        }

        // Rate limiting
        const now = Date.now();
        const clientData = rateLimitMap.get(ipHash);

        if (clientData && (now - clientData.lastRequest < 30000)) {
            const waitTime = Math.ceil((30000 - (now - clientData.lastRequest)) / 1000);
            return res.status(429).json({ 
                error: `Bitte warten Sie noch ${waitTime} Sekunden!`,
                code: 'RATE_LIMIT',
                waitTime
            });
        }

        // Update rate limit
        rateLimitMap.set(ipHash, {
            lastRequest: now,
            count: (clientData?.count || 0) + 1
        });

        // Clean old entries (prevent memory leak)
        if (rateLimitMap.size > 10000) {
            const toDelete = [];
            rateLimitMap.forEach((value, key) => {
                if (now - value.lastRequest > 60000) {
                    toDelete.push(key);
                }
            });
            toDelete.forEach(key => rateLimitMap.delete(key));
        }

        // Sentiment analysis (basic)
        const sentiment = analyzeSentiment(trimmedMessage);

        // Auto-tagging
        const tags = generateTags(trimmedMessage);

        // Prepare device info
        const deviceInfo = metadata || {};

        // Insert message into Supabase
        const { data, error } = await supabase
            .from('messages')
            .insert([
                { 
                    message: trimmedMessage,
                    created_at: new Date().toISOString(),
                    character_count: trimmedMessage.length,
                    ip_hash: ipHash,
                    sentiment: sentiment,
                    tags: tags,
                    device_info: deviceInfo,
                    is_spam: isSpam,
                    is_blocked: false,
                    is_starred: false,
                    is_archived: false,
                    battery_level: deviceInfo.battery || null,
                    device_type: deviceInfo.deviceType || null,
                    browser: deviceInfo.browser || null,
                    os: deviceInfo.os || null,
                    screen_resolution: deviceInfo.screenResolution || null,
                    language: deviceInfo.language || null,
                    timezone: deviceInfo.timezone || null
                }
            ])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ 
                error: 'Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
                code: 'DATABASE_ERROR',
                details: error.message
            });
        }

        // Success response
        return res.status(200).json({ 
            success: true, 
            message: 'Nachricht erfolgreich gesendet!',
            data: {
                id: data[0].id,
                timestamp: data[0].created_at,
                characterCount: trimmedMessage.length,
                sentiment: sentiment,
                tags: tags
            },
            meta: {
                version: '2.0',
                serverTime: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Serverfehler. Bitte versuchen Sie es später erneut.',
            code: 'INTERNAL_ERROR',
            details: error.message
        });
    }
};

// =====================================
// 🛠️ HELPER FUNCTIONS
// =====================================

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

function analyzeSentiment(text) {
    const positive = ['gut', 'schön', 'toll', 'super', 'prima', 'wunderbar', 'fantastisch', 'liebe', 'glücklich', 'freude', 'danke'];
    const negative = ['schlecht', 'böse', 'hass', 'traurig', 'wütend', 'ärger', 'furchtbar', 'schrecklich', 'problem', 'angst'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positive.forEach(word => {
        if (lowerText.includes(word)) score += 1;
    });
    
    negative.forEach(word => {
        if (lowerText.includes(word)) score -= 1;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
}

function generateTags(text) {
    const tags = [];
    const lowerText = text.toLowerCase();
    
    // Category detection
    const categories = {
        'Liebe': ['liebe', 'herz', 'beziehung', 'freund', 'partner'],
        'Arbeit': ['arbeit', 'job', 'chef', 'kollege', 'büro'],
        'Familie': ['familie', 'mutter', 'vater', 'eltern', 'kind'],
        'Freundschaft': ['freund', 'kumpel', 'bff', 'buddy'],
        'Schule': ['schule', 'lehrer', 'unterricht', 'klasse', 'prüfung'],
        'Gesundheit': ['gesundheit', 'krank', 'arzt', 'medizin'],
        'Freizeit': ['hobby', 'sport', 'musik', 'film', 'reise'],
        'Gefühle': ['glücklich', 'traurig', 'wütend', 'angst', 'freude']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                if (!tags.includes(category)) {
                    tags.push(category);
                }
                break;
            }
        }
    }
    
    // Length-based tags
    if (text.length < 50) tags.push('Kurz');
    if (text.length > 200) tags.push('Lang');
    
    // Question detection
    if (text.includes('?')) tags.push('Frage');
    
    return tags;
}
