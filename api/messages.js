const { createClient } = require('@supabase/supabase-js');

const ADMIN_PASSWORD = '19105887638'; // Admin-Passwort (ÄNDERN SIE DIES!)

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Get password from query parameter
        const { password } = req.query;

        // Verify admin password
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ 
                error: 'Unauthorized',
                message: 'Falsches Passwort'
            });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Server-Konfigurationsfehler' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Handle different HTTP methods
        if (req.method === 'GET') {
            return await handleGet(req, res, supabase);
        } else if (req.method === 'POST') {
            return await handlePost(req, res, supabase);
        } else if (req.method === 'DELETE') {
            return await handleDelete(req, res, supabase);
        } else {
            return res.status(405).json({ error: 'Methode nicht erlaubt' });
        }

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Serverfehler' });
    }
};

// =====================================
// 📥 GET - Fetch messages
// =====================================

async function handleGet(req, res, supabase) {
    const { filter, limit = 100 } = req.query;

    let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

    // Apply filters
    if (filter === 'starred') {
        query = query.eq('is_starred', true);
    } else if (filter === 'spam') {
        query = query.eq('is_spam', true);
    } else if (filter === 'archived') {
        query = query.eq('is_archived', true);
    } else if (filter === 'positive') {
        query = query.eq('sentiment', 'positive');
    } else if (filter === 'negative') {
        query = query.eq('sentiment', 'negative');
    }

    const { data, error } = await query;

    if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Datenbankfehler' });
    }

    return res.status(200).json({
        success: true,
        messages: data || [],
        count: data?.length || 0
    });
}

// =====================================
// 📝 POST - Update message
// =====================================

async function handlePost(req, res, supabase) {
    const { action, messageId, data: updateData } = req.body;

    if (!messageId) {
        return res.status(400).json({ error: 'messageId erforderlich' });
    }

    let updates = {};

    switch (action) {
        case 'star':
            updates = { is_starred: updateData.starred };
            break;
        case 'archive':
            updates = { is_archived: updateData.archived };
            break;
        case 'spam':
            updates = { is_spam: updateData.spam };
            break;
        case 'note':
            updates = { admin_note: updateData.note };
            break;
        case 'block':
            updates = { is_blocked: updateData.blocked };
            break;
        default:
            return res.status(400).json({ error: 'Ungültige Aktion' });
    }

    const { data, error } = await supabase
        .from('messages')
        .update(updates)
        .eq('id', messageId)
        .select();

    if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Update fehlgeschlagen' });
    }

    return res.status(200).json({
        success: true,
        message: 'Nachricht aktualisiert',
        data: data[0]
    });
}

// =====================================
// 🗑️ DELETE - Delete message
// =====================================

async function handleDelete(req, res, supabase) {
    const { messageId, messageIds } = req.body;

    if (messageIds && Array.isArray(messageIds)) {
        // Bulk delete
        const { error } = await supabase
            .from('messages')
            .delete()
            .in('id', messageIds);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Löschen fehlgeschlagen' });
        }

        return res.status(200).json({
            success: true,
            message: `${messageIds.length} Nachrichten gelöscht`
        });
    } else if (messageId) {
        // Single delete
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Löschen fehlgeschlagen' });
        }

        return res.status(200).json({
            success: true,
            message: 'Nachricht gelöscht'
        });
    } else {
        return res.status(400).json({ error: 'messageId oder messageIds erforderlich' });
    }
}
