class Security {
  constructor(trustedTypes) {
    this.trustedTypes = trustedTypes || window.trustedTypes;
    this.supportsTrustedTypes =
      !!(this.trustedTypes && this.trustedTypes.createPolicy);
    let trustedTypesPolicy = {
      createHTML: function (html) {
        // Trust all strings passed to this function.
        return html;
      }
    };

    try {
      if (this.supportsTrustedTypes) {
        trustedTypesPolicy = this.trustedTypes.createPolicy('quill', trustedTypesPolicy);
      }
    } catch (e) {}

    // Security: Only call this function with HTML from a trusted source.
    this.blessHTML = trustedTypesPolicy.createHTML.bind(trustedTypesPolicy);
  }

  // Security: Only call this function with an object containing HTML from a trusted source.
  deepBless(input) {
    return JSON.parse(JSON.stringify(input), (key, value) => {
      return typeof value === 'string' ? this.blessHTML(value) : value;
    });
  }

  isTrustedHTML(value) {
    return this.supportsTrustedTypes && this.trustedTypes.isHTML(value);
  }

  replace(value, target, replacement) {
    return this.isTrustedHTML(value) ? this.blessHTML(value.toString().replace(target, replacement)) : value.replace(target, replacement);
  }
}

export default Security;
