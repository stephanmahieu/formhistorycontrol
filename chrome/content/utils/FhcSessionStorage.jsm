var EXPORTED_SYMBOLS = ["sessionStore"];

var sessionStore = {

    set: function(key, value) {
        sessionMap.set(key, value);
    },

    get: function(key) {
        if (sessionMap.has(key)) {
            return sessionMap.get(key);
        }
        return "";
    }
};

var sessionMap = new Map();