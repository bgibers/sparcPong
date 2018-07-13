const chai = require('chai');
chai.use(require('chai-http'));
const mongoose = require('mongoose');
const app = require('../app');
const assert = chai.assert;

describe('Player', () => {
    let requester = chai.request(app).keepOpen();
    let CREATED_USER = {
        username: 'integration',
        password: 'integration',
        firstName: 'Integration',
        lastName: 'Test',
        phone: 8430000000,
        email: 'integration@fake_domain.com'
    };

    before(wipeDatabase);

    after(() => {
        requester.close();
    });

    describe('Creation Process', () => {
        it('successfully creates player', (done) => {
            requester
                .post('/api/player')
                .send(CREATED_USER)
                .end((err, res) => {
                    assert.equal(res.statusCode, 200, 'Status code');
                    done();
                });
        });

        describe('Username verification', () => {
            it('blocks duplicate usernames', (done) => {
                let payload = scramblePayload(CREATED_USER);
                payload.username = CREATED_USER.username;
                requester
                    .post('/api/player')
                    .send(payload)
                    .end((err, res) => {
                        assert.equal(res.statusCode, 500, 'Status Code');
                        assert.equal(res.body, 'Player username already exists.');
                        done();
                    });
            });
            it('blocks empty usernames', (done) => {
                let payload = scramblePayload(CREATED_USER);
                payload.username = '';
                requester
                    .post('/api/player')
                    .send(payload)
                    .end((err, res) => {
                        assert.equal(res.statusCode, 500, 'Status Code');
                        assert.equal(res.body, 'You must give a username.');
                        done();
                    });
            });
        });

        describe('Email verification', () => {
            it('blocks duplicate emails', (done) => {
                let payload = scramblePayload(CREATED_USER);
                payload.email = CREATED_USER.email;

                requester
                    .post('/api/player')
                    .send(payload)
                    .end((err, res) => {
                        assert.equal(res.statusCode, 500, 'Status Code');
                        assert.equal(res.body, 'Email already exists.');
                        done();
                    });
            });
            it('blocks empty emails', (done) => {
                let payload = scramblePayload(CREATED_USER);
                payload.email = '';

                requester
                    .post('/api/player')
                    .send(payload)
                    .end((err, res) => {
                        assert.equal(res.statusCode, 500, 'Status Code');
                        assert.equal(res.body, 'You must give an email.');
                        done();
                    });
            });
        });
    });

    describe('Login Process', () => {
        it('fetches login options', (done) => {
            requester
                .get('/auth/logins')
                .end((err, res) => {
                    assert.equal(res.statusCode, 200, 'Status Code');
                    assert.isNotEmpty(res.body.message);
                    done();
                });
        });
        it('login options contain no personal data', (done) => {
            requester
                .get('/auth/logins')
                .end((err, res) => {
                    res.body.message.forEach(login => {
                        assert.hasAllKeys(login, ['_id', 'username']);
                    });
                    done();
                });
        });
    });

    describe('Reading Players Process', () => {
        it('requires authorization to fetch all players', (done) => {
            requester
                .get('/api/player')
                .end((err, res) => {
                    assert.equal(res.text, 'No Authorization header.');
                    assert.equal(res.statusCode, 401, 'Status code');
                    done();
                });
        });
        it('requires authorization to get profile', (done) => {
            requester
                .get('/api/player/fetch/id123')
                .end((err, res) => {
                    assert.equal(res.text, 'No Authorization header.');
                    assert.equal(res.statusCode, 401, 'Status code');
                    done();
                });
        });
        it('requires authorization to get record', (done) => {
            requester
                .get('/api/player/record/id123')
                .end((err, res) => {
                    assert.equal(res.text, 'No Authorization header.');
                    assert.equal(res.statusCode, 401, 'Status code');
                    done();
                });
        });
    });

    describe('Update Player Process', () => {
        it('requires authorization to update username', done => {
            requester
                .post('/api/player/change/username')
                .end((err, res) => {
                    assert.equal(res.text, 'No Authorization header.');
                    assert.equal(res.statusCode, 401, 'Status code');
                    done();
                });
        });
        it('requires authorization to update password', done => {
            requester
                .post('/api/player/change/password')
                .end((err, res) => {
                    assert.equal(res.text, 'No Authorization header.');
                    assert.equal(res.statusCode, 401, 'Status code');
                    done();
                });
        });
        it('requires authorization to update email', done => {
            requester
                .post('/api/player/change/email')
                .end((err, res) => {
                    assert.equal(res.text, 'No Authorization header.');
                    assert.equal(res.statusCode, 401, 'Status code');
                    done();
                });
        });
        it('requires authorization to remove email', done => {
            requester
                .post('/api/player/change/email/remove')
                .end((err, res) => {
                    assert.equal(res.text, 'No Authorization header.');
                    assert.equal(res.statusCode, 401, 'Status code');
                    done();
                });
        });
    });
});


function scramblePayload(payload) {
    let scrambled = {};
    Object.keys(payload).forEach(key => {
        scrambled[key] = payload[key] + 1;
    });
    return scrambled;
}

function wipeDatabase(done) {
    mongoose.connect('mongodb://127.0.0.1/sparcPongDb_test', () => {
        mongoose.connection.db.dropDatabase();
        done();
    });
}