const chai = require('chai');
chai.use(require('chai-http'));
const assert = chai.assert;

// Setup App
const TEST_DB_URI = 'mongodb://127.0.0.1/sparcPongDb_test';
process.env.MONGODB_URI = TEST_DB_URI;

const app = require('../app');

const mongoose = require('mongoose');
const Player = mongoose.model('Player');

const AuthService = require('../services/AuthService');

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
        describe('Player creation', () => {
            it('succeeds', (done) => {
                requester
                    .post('/api/player')
                    .send(CREATED_USER)
                    .end((err, res) => {
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
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
                        assert.equal(res.body, 'You must provide an email address.');
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
                    assert.isArray(res.body.message);
                    assert.isNotEmpty(res.body.message);
                    done();
                });
        });
        it('sanitizes personal data', (done) => {
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
        let token, id;

        before(done => {
            Promise.all([
                createToken(CREATED_USER.username),
                getPlayerId(CREATED_USER.username)
            ])
                .then(results => {
                    [token, id] = results;
                })
                .finally(done);
        });

        describe('fetching all players', () => {
            it('requires authorization', (done) => {
                requester
                    .get('/api/player')
                    .end((err, res) => {
                        assert.include(res.text, 'No Authorization header.');
                        assert.equal(res.statusCode, 401, 'Status code');
                        done();
                    });
            });
            it('returns array of players', (done) => {
                requester
                    .get('/api/player')
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.isArray(res.body.message);
                        assert(res.body.message.length >= 1, 'Expected at least 1 player.');
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
            });
        });
        describe('fetching profile', () => {
            it('requires authorization', (done) => {
                requester
                    .get('/api/player/fetch/id123')
                    .end((err, res) => {
                        assert.include(res.text, 'No Authorization header.');
                        assert.equal(res.statusCode, 401, 'Status code');
                        done();
                    });
            });
            it('returns profile', (done) => {
                requester
                    .get(`/api/player/fetch/${id}`)
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.isObject(res.body.message, 'Expected player object.');
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
            });
            it('returns correct profile', (done) => {
                requester
                    .get(`/api/player/fetch/${id}`)
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.containsAllKeys(res.body.message, ['_id']);
                        assert.equal(res.body.message._id, id, 'Incorrect profile id.');
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
            });
        });

        describe('fetching record', () => {
            it('requires authorization', (done) => {
                requester
                    .get(`/api/player/record/${id}`)
                    .end((err, res) => {
                        assert.include(res.text, 'No Authorization header.');
                        assert.equal(res.statusCode, 401, 'Status code');
                        done();
                    });
            });
            it('returns wins and losses', (done) => {
                requester
                    .get(`/api/player/record/${id}`)
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.hasAllKeys(res.body.message, ['wins', 'losses']);
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
            });
            it('returns win and loss count', (done) => {
                requester
                    .get(`/api/player/record/${id}`)
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.isNumber(res.body.message.wins, 'Wins');
                        assert.isNumber(res.body.message.losses, 'Losses');
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
            });
        });
    });

    describe('Update Player Process', () => {
        let token, id;

        before(done => {
            Promise.all([
                createToken(CREATED_USER.username),
                getPlayerId(CREATED_USER.username)
            ])
                .then(results => {
                    [token, id] = results;
                })
                .finally(done);
        });

        describe('updating username', () => {
            it('requires authorization', done => {
                requester
                    .post('/api/player/change/username')
                    .end((err, res) => {
                        assert.include(res.text, 'No Authorization header.');
                        assert.equal(res.statusCode, 401, 'Status code');
                        done();
                    });
            });
            it('requires new username', done => {
                requester
                    .post('/api/player/change/username')
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.equal(res.body, 'You must give a username.');
                        assert.equal(res.statusCode, 500, 'Status code');
                        done();
                    });
            });
            it('can be updated', done => {
                requester
                    .post('/api/player/change/username')
                    .send({
                        newUsername: `${CREATED_USER.username}_new`
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
            });
            it('can be updated back', done => {
                requester
                    .post('/api/player/change/username')
                    .send({
                        newUsername: CREATED_USER.username
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
            });
        });


        describe('updating password', () => {
            it('requires authorization', done => {
                requester
                    .post('/api/player/change/password')
                    .end((err, res) => {
                        assert.include(res.text, 'No Authorization header.');
                        assert.equal(res.statusCode, 401, 'Status code');
                        done();
                    });
            });
            it('requires valid current password', done => {
                requester
                    .post('/api/player/change/password')
                    .send({
                        oldPassword: `${CREATED_USER.password}_extra`,
                        newPassword: 'NEW_PASSWORD'
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.include(res.text, 'Incorrect current password.');
                        assert.equal(res.statusCode, 500, 'Status code');
                        done();
                    });
            });
            it('requires valid current password', done => {
                requester
                    .post('/api/player/change/password')
                    .send({
                        oldPassword: `${CREATED_USER.password}_extra`,
                        newPassword: 'NEW_PASSWORD'
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.include(res.text, 'Incorrect current password.');
                        assert.equal(res.statusCode, 500, 'Status code');
                        done();
                    });
            });
            it('blocks short passwords', done => {
                // Do not test if minimum threshold has not been set
                if (AuthService.PASSWORD_MIN_LENGTH <= 0) done();

                requester
                    .post('/api/player/change/password')
                    .send({
                        oldPassword: CREATED_USER.password,
                        newPassword: 'X'.repeat(AuthService.PASSWORD_MIN_LENGTH - 1)
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.include(res.text, `Password must be at least ${AuthService.PASSWORD_MIN_LENGTH} characters in length.`);
                        assert.equal(res.statusCode, 500, 'Status code');
                        done();
                    });
            });
            it('blocks long passwords', done => {
                requester
                    .post('/api/player/change/password')
                    .send({
                        oldPassword: CREATED_USER.password,
                        newPassword: 'X'.repeat(AuthService.PASSWORD_MAX_LENGTH + 1)
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.include(res.text, `Password cannot be longer than ${AuthService.PASSWORD_MAX_LENGTH} characters.`);
                        assert.equal(res.statusCode, 500, 'Status code');
                        done();
                    });
            });
            it('can update password', done => {
                requester
                    .post('/api/player/change/password')
                    .send({
                        oldPassword: `${CREATED_USER.password}`,
                        newPassword: 'NEW_PASSWORD'
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.equal(res.body.message, 'Successfully changed your password');
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
            });
            it('can update password back', done => {
                requester
                    .post('/api/player/change/password')
                    .send({
                        oldPassword: `NEW_PASSWORD`,
                        newPassword: `${CREATED_USER.password}`
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.equal(res.body.message, 'Successfully changed your password');
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
            });
        });

        describe('updating email', () => {
            it('requires authorization', done => {
                requester
                    .post('/api/player/change/email/remove')
                    .end((err, res) => {
                        assert.include(res.text, 'No Authorization header.');
                        assert.equal(res.statusCode, 401, 'Status code');
                        done();
                    });
            });
            it('blocks short emails', done => {
                requester
                    .post('/api/player/change/email')
                    .send({
                        newEmail: ''
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.include(res.text, 'You must provide an email address.');
                        assert.equal(res.statusCode, 500, 'Status code');
                        done();
                    });
            });
            it('blocks long emails', done => {
                requester
                    .post('/api/player/change/email')
                    .send({
                        newEmail: 'X'.repeat(50+1)
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.include(res.text, 'Email length cannot exceed 50 characters.');
                        assert.equal(res.statusCode, 500, 'Status code');
                        done();
                    });
            });
            it('requires @ symbol', done => {
                requester
                    .post('/api/player/change/email')
                    .send({
                        newEmail: 'emailwithoutsymbol.com'
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.include(res.text, 'Email must contain one @ symbol.');
                        assert.equal(res.statusCode, 500, 'Status code');
                        done();
                    });
            });
            it('requires . symbol', done => {
                requester
                    .post('/api/player/change/email')
                    .send({
                        newEmail: 'email@noperiod'
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.include(res.text, 'Email must contain at least one period.');
                        assert.equal(res.statusCode, 500, 'Status code');
                        done();
                    });
            });
            it('can be removed', done => {
                requester
                    .post('/api/player/change/email/remove')
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.equal(res.body.message, 'Successfully removed your email!');
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
            });
            it('can be updated', done => {
                requester
                    .post('/api/player/change/email')
                    .send({
                        newEmail: CREATED_USER.email
                    })
                    .set('Authorization', `JWT ${token}`)
                    .end((err, res) => {
                        assert.equal(res.body.message, `Successfully changed your email to ${CREATED_USER.email}!`);
                        assert.equal(res.statusCode, 200, 'Status code');
                        done();
                    });
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

function createToken(username) {
    return Player.findOne({'username': username}).exec()
        .then(player => {
            return AuthService.createToken(player._id);
        });
}

function getPlayerId(username) {
    return Player.findOne({'username': username}).exec()
        .then(player => {
            return player._id;
        });
}

function wipeDatabase(done) {
    mongoose.connect(TEST_DB_URI, () => {
        mongoose.connection.db.dropDatabase();
        done();
    });
}