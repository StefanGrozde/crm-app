import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const EditCompany = () => {
    const [company, setCompany] = useState({
        name: '',
        industry: '',
        website: '',
        phone_number: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCompany = async () => {
            if (user && user.company_id) {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`https://backend.svnikolaturs.mk/api/company/${user.company_id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    setCompany(res.data);
                    setLoading(false);
                } catch (err) {
                    setError('Failed to fetch company data');
                    setLoading(false);
                }
            }
        };

        fetchCompany();
    }, [user]);

    const onChange = e => {
        setCompany({ ...company, [e.target.name]: e.target.value });
    };

    const onSubmit = async e => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`https://backend.svnikolaturs.mk/api/company/${user.company_id}`, company, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            navigate('/dashboard');
        } catch (err) {
            setError('Failed to update company data');
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container">
            <h2>Edit Company</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={onSubmit}>
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={company.name}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Industry</label>
                    <input
                        type="text"
                        className="form-control"
                        name="industry"
                        value={company.industry || ''}
                        onChange={onChange}
                    />
                </div>
                <div className="form-group">
                    <label>Website</label>
                    <input
                        type="text"
                        className="form-control"
                        name="website"
                        value={company.website || ''}
                        onChange={onChange}
                    />
                </div>
                <div className="form-group">
                    <label>Phone Number</label>
                    <input
                        type="text"
                        className="form-control"
                        name="phone_number"
                        value={company.phone_number || ''}
                        onChange={onChange}
                    />
                </div>
                <button type="submit" className="btn btn-primary">Update Company</button>
            </form>
        </div>
    );
};

export default EditCompany;
