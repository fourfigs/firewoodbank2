
import React, { useState } from 'react';
import { invokeTauri } from '../api/tauri';

interface ChangeRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export default function ChangeRequestModal({ isOpen, onClose, userId }: ChangeRequestModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await invokeTauri('create_change_request', {
                input: {
                    title,
                    description,
                    requested_by_user_id: userId,
                },
            });
            onClose();
            setTitle('');
            setDescription('');
        } catch (e: any) {
            setError(e.toString());
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>Request Change</h3>
                <p>Found a bug or need to update your profile? Let us know.</p>

                {error && <div className="pill" style={{ background: '#fbe2e2', color: '#b3261e' }}>{error}</div>}

                <form onSubmit={handleSubmit} className="stack">
                    <label>
                        Subject
                        <input
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g., Update Phone Number"
                        />
                    </label>
                    <label>
                        Description
                        <textarea
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={4}
                            placeholder="Please describe the change..."
                        />
                    </label>
                    <div className="actions">
                        <button className="ping" type="submit" disabled={busy}>Submit Request</button>
                        <button className="ghost" type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
