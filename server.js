const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/:formId/filteredResponses', async (req, res) => {
    const { formId } = req.params;
    const { page = 1, perPage = 10, filters } = req.query;
    const apiUrl = `https://api.fillout.com/v1/api/forms/${formId}/submissions?page=${page}&perPage=${perPage}`;
    const headers = { Authorization: `Bearer ${process.env.FILL_OUT_API_KEY}` };

    try {
        const response = await axios.get(apiUrl, { headers });
        let parsedFilters = filters ? JSON.parse(filters) : [];

        const filteredResponses = response.data.responses.filter(submission => {
            return parsedFilters.every(filter => {
                const question = submission.questions.find(q => q.id === filter.id);
                if (!question) return false;

                switch (filter.condition) {
                    case 'equals': return question.value === filter.value;
                    case 'does_not_equal': return question.value !== filter.value;
                    case 'greater_than': return new Date(question.value) > new Date(filter.value);
                    case 'less_than': return new Date(question.value) < new Date(filter.value);
                    default: return false;
                }
            });
        });

        if (filteredResponses.length === 0) {
            return res.status(404).json({ message: 'No matching submissions found.' });
        }

        res.json({
            responses: filteredResponses,
            totalResponses: filteredResponses.length,
            pageCount: Math.ceil(filteredResponses.length / perPage)
        });
    } catch (error) {
        if (error.response) {
            // Axios response error handling
            return res.status(error.response.status).json({ message: error.response.data.message || 'Error fetching data' });
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Error', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error', error.message);
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
