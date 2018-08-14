const chai = require('chai');
chai.use(require('chai-http'));
const assert = chai.assert;

// Setup App
const TEST_DB_URI = 'mongodb://127.0.0.1/sparcPongDb_test';
process.env.MONGODB_URI = TEST_DB_URI;
process.env.CHALLENGE_ANYTIME = true;

const app = require('../app');

const mongoose = require('mongoose');
const Player = mongoose.model('Player');
const Challenge = mongoose.model('Challenge');

const AuthService = require('../services/AuthService');

describe('Challenge', () => {
    let requester = chai.request(app).keepOpen();
    let CREATED_USER_1 = {
        username: 'integration1',
        password: 'integration1',
        firstName: 'Integration1',
        lastName: 'Test1',
        phone: 8430000001,
        email: 'integration1@fake_domain.com'
    };
    let CREATED_USER_2 = {
        username: 'integration2',
        password: 'integration2',
        firstName: 'Integration2',
        lastName: 'Test2',
        phone: 8430000002,
        email: 'integration2@fake_domain.com'
    };
    let CREATED_USER_3 = {
        username: 'integration3',
        password: 'integration3',
        firstName: 'Integration3',
        lastName: 'Test3',
        phone: 8430000003,
        email: 'integration3@fake_domain.com'
    };
    let CREATED_USER_4 = {
        username: 'integration4',
        password: 'integration4',
        firstName: 'Integration4',
        lastName: 'Test4',
        phone: 8430000004,
        email: 'integration4@fake_domain.com'
    };
    let CREATED_USER_5 = {
        username: 'integration5',
        password: 'integration5',
        firstName: 'Integration5',
        lastName: 'Test5',
        phone: 8430000005,
        email: 'integration5@fake_domain.com'
    };

    let token1, token2, token3, token4, token5, id1, id2, id3, id4, id5;

    before(done => {
        new Promise((resolve, reject) => {
            wipeDatabase(resolve);
        })
            .then(results => {
                return new Promise((resolve, reject) => {
                    requester.post('/api/player').send(CREATED_USER_1).end(resolve);
                })
            })
            .then(results => {
                return new Promise((resolve, reject) => {
                    requester.post('/api/player').send(CREATED_USER_2).end(resolve)
                });
            })
            .then(results => {
                return new Promise((resolve, reject) => {
                    requester.post('/api/player').send(CREATED_USER_3).end(resolve)
                });
            })
            .then(results => {
                return new Promise((resolve, reject) => {
                    requester.post('/api/player').send(CREATED_USER_4).end(resolve)
                });
            })
            .then(results => {
                return new Promise((resolve, reject) => {
                    requester.post('/api/player').send(CREATED_USER_5).end(resolve)
                });
            })
            .then(results => {
                return Promise.all([
                    createToken(CREATED_USER_1.username),
                    createToken(CREATED_USER_2.username),
                    createToken(CREATED_USER_3.username),
                    createToken(CREATED_USER_4.username),
                    createToken(CREATED_USER_5.username),
                    getPlayerId(CREATED_USER_1.username),
                    getPlayerId(CREATED_USER_2.username),
                    getPlayerId(CREATED_USER_3.username),
                    getPlayerId(CREATED_USER_4.username),
                    getPlayerId(CREATED_USER_5.username)
                ]);
            })
            .then(results => {
                return [token1, token2, token3, token4, token5, id1, id2, id3, id4, id5] = results;
            })
            .catch(console.error)
            .finally(done);
    });

    after(() => {
        requester.close();
    });

    describe('Creation Process', () => {

        it('Requires authorization', done => {
            requester
                .post('/api/challenge/player')
                .end((err, res) => {
                    assert.equal(res.statusCode, 401, 'Status code');
                    done();
                });
        });
        it('Blocks challenging lower ranks', done => {
            requester
                .post('/api/challenge/player')
                .set('Authorization', `JWT ${token3}`)
                .send({
                    challengeeId: id4
                })
                .end((err, res) => {
                    assert.include(res.text, 'You cannot challenger an opponent below your rank.');
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Blocks challenging yourself', done => {
            requester
                .post('/api/challenge/player')
                .set('Authorization', `JWT ${token3}`)
                .send({
                    challengeeId: id3
                })
                .end((err, res) => {
                    assert.include(res.text, 'Players cannot challenge themselves.');
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Blocks challenging beyond one tier', done => {
            requester
                .post('/api/challenge/player')
                .set('Authorization', `JWT ${token4}`)
                .send({
                    challengeeId: id1
                })
                .end((err, res) => {
                    assert.include(res.text, 'You cannot challenge an opponent beyond 1 tier.');
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Successfully issues a challenge outside a tier', done => {
            requester
                .post('/api/challenge/player')
                .set('Authorization', `JWT ${token2}`)
                .send({
                    challengeeId: id1
                })
                .end((err, res) => {
                    assert.equal(res.statusCode, 200, 'Status code');
                    done();
                });
        });
        it('Blocks challenging a player with an existing outgoing challenge', done => {
            requester
                .post('/api/challenge/player')
                .set('Authorization', `JWT ${token4}`)
                .send({
                    challengeeId: id2
                })
                .end((err, res) => {
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Blocks challenging a player with an existing incoming challenge', done => {
            requester
                .post('/api/challenge/player')
                .set('Authorization', `JWT ${token4}`)
                .send({
                    challengeeId: id1
                })
                .end((err, res) => {
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Successfully issues a challenge within a tier', done => {
            requester
                .post('/api/challenge/player')
                .set('Authorization', `JWT ${token5}`)
                .send({
                    challengeeId: id4
                })
                .end((err, res) => {
                    assert.equal(res.statusCode, 200, 'Status code');
                    done();
                });
        });
        it('Blocks challenging a player before resolving outgoing challenges', done => {
            requester
                .post('/api/challenge/player')
                .set('Authorization', `JWT ${token5}`)
                .send({
                    challengeeId: id3
                })
                .end((err, res) => {
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Blocks challenging a player before resolving incoming challenges', done => {
            requester
                .post('/api/challenge/player')
                .set('Authorization', `JWT ${token3}`)
                .send({
                    challengeeId: id2
                })
                .end((err, res) => {
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
    });

    describe('Revoke Process', () => {

        let challengeId;

        before(done => {
            getChallengeId(id5)
                .then(id => {
                    challengeId = id;
                })
                .catch(console.error)
                .finally(done);
        });

        it('Requires authorization', done => {
            requester
                .delete('/api/challenge/player/revoke')
                .end((err, res) => {
                    assert.equal(res.statusCode, 401, 'Status code');
                    done();
                });
        });
        it('Blocks revoking somebody else\'s challenge', done => {
            requester
                .delete('/api/challenge/player/revoke')
                .set('Authorization', `JWT ${token3}`)
                .send({
                    challengeId: challengeId
                })
                .end((err, res) => {
                    assert.include(res.text, 'Only the challenger can revoke this challenge.');
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Blocks challengee from revoking challenge', done => {
            requester
                .delete('/api/challenge/player/revoke')
                .set('Authorization', `JWT ${token4}`)
                .send({
                    challengeId: challengeId
                })
                .end((err, res) => {
                    assert.include(res.text, 'Only the challenger can revoke this challenge.');
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Successfully revokes a challenge', done => {
            requester
                .delete('/api/challenge/player/revoke')
                .set('Authorization', `JWT ${token5}`)
                .send({
                    challengeId: challengeId
                })
                .end((err, res) => {
                    assert.equal(res.statusCode, 200, 'Status code');
                    done();
                });
        });
    });

    describe('Resolve Process', () => {

        let challengeId;

        before(done => {
            getChallengeId(id1)
                .then(id => {
                    challengeId = id;
                })
                .catch(console.error)
                .finally(done);
        });

        it('Requires authorization', done => {
            requester
                .post('/api/challenge/player/resolve')
                .end((err, res) => {
                    assert.equal(res.statusCode, 401, 'Status code');
                    done();
                });
        });
        it('Blocks resolving without a score', done => {
            requester
                .post('/api/challenge/player/resolve')
                .set('Authorization', `JWT ${token2}`)
                .send({
                    challengeId: challengeId
                })
                .end((err, res) => {
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Blocks resolving with a negative score', done => {
            requester
                .post('/api/challenge/player/resolve')
                .set('Authorization', `JWT ${token2}`)
                .send({
                    challengeId: challengeId,
                    challengerScore: -1,
                    challengeeScore: -2
                })
                .end((err, res) => {
                    assert.include(res.text, 'Both scores must be positive.');
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Blocks resolving with equal scores', done => {
            requester
                .post('/api/challenge/player/resolve')
                .set('Authorization', `JWT ${token2}`)
                .send({
                    challengeId: challengeId,
                    challengerScore: 1,
                    challengeeScore: 1
                })
                .end((err, res) => {
                    assert.include(res.text, 'The final score cannot be equal.');
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Blocks resolving with less than 2 games', done => {
            requester
                .post('/api/challenge/player/resolve')
                .set('Authorization', `JWT ${token2}`)
                .send({
                    challengeId: challengeId,
                    challengerScore: 0,
                    challengeeScore: 1
                })
                .end((err, res) => {
                    assert.include(res.text, 'A valid set consists of at least 2 games.');
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Blocks resolving somebody else\'s challenge', done => {
            requester
                .post('/api/challenge/player/resolve')
                .set('Authorization', `JWT ${token3}`)
                .send({
                    challengeId: challengeId,
                    challengerScore: 1,
                    challengeeScore: 2
                })
                .end((err, res) => {
                    assert.include(res.text, 'Only an involved player can resolve this challenge.');
                    assert.equal(res.statusCode, 500, 'Status code');
                    done();
                });
        });
        it('Successfully resolves a challenge', done => {
            requester
                .post('/api/challenge/player/resolve')
                .set('Authorization', `JWT ${token2}`)
                .send({
                    challengeId: challengeId,
                    challengerScore: 1,
                    challengeeScore: 2
                })
                .end((err, res) => {
                    assert.equal(res.statusCode, 200, 'Status code');
                    done();
                });
        });
    });

});

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

function getChallengeId(userId) {
    return Challenge.find({$or: [{challenger: userId}, {challengee: userId}]}).exec()
        .then(challenges => {
            return challenges[0]._id;
        });
}

function wipeDatabase(done) {
    mongoose.connect(TEST_DB_URI, () => {
        mongoose.connection.db.dropDatabase();
        done();
    });
}
