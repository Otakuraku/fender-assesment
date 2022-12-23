const expect = require("chai").expect;
const request = require("request");

describe("Users", function() {
    describe("Create user", function() {
        it("creates user", function() {
            request({ uri: "http://localhost:3000/user/create", method: "POST",
            json: { name: "Test", email: "test@test.com", password: "test123" } },
                (error,response,body) => {
                expect(response.statusCode).to.equal(200);
                });
        });
    });
    describe("Login user", function() {
        it("logs in user", function() {
            request({ uri: "http://localhost:3000/user/login", method: "POST",
                    json: { email: "test@test.com", password: "test123" } },
                (error,response,body) => {
                    expect(response.statusCode).to.equal(200);
                });
        });
    });
});