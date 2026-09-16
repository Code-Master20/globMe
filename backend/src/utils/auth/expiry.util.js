const isExpiredDate = (value) => {
  if (!value) {
    return false;
  }

  // UNDERSTANDING :-
  // const vale = new Date();
// Date.prototype is an special object associates with Date object
// Date.prototype contains enormous methods link to Date object
// like : getTime(), toISOString(), getFullYear(), etc.
// This instance , value is internally connected to Date.prototype
// Object.getPrototypeOf(value) returns same as Date.prototype returns
// so Object.getPrototypeOf(value)=== Date.prototype ===> true
// And[ date instanceof Date ] means :it essentially asks: "Is Date.prototype found anywhere in the prototype chain of date?"
  const expiresAt = value instanceof Date ? value : new Date(value);
//expiresAt.getTime() returns something like 1789586621199 if otp is not expired yet so the below if-statement not execute
// THis below statement ensured that otp is still valid 
  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt.getTime() <= Date.now(); //this returns true
};

const getRemainingSeconds = (value) => {
  if (!value) {
    return 0;
  }

  const expiresAt = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(expiresAt.getTime())) {
    return 0;
  }

  const remainingMs = expiresAt.getTime() - Date.now();

  if (remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / 1000);
};

module.exports = {
  isExpiredDate,
  getRemainingSeconds,
};
