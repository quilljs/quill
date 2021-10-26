import Security from '../../../core/security';

let MOCK_TRUSTED_TYPES = {
  createPolicy: (name, func) => {
    return {
      createHTML: (value) => {
        return {
          isHTML: true,
          toString: () => func.createHTML(value)
        }
      }
    }
  },
  isHTML: (value) => !!value.isHTML
};

describe('Security', function() {
  describe('with Trusted Types support', function() {
    beforeEach(function() {
      this.security = new Security(MOCK_TRUSTED_TYPES);
    });

    describe('blessHTML()', function() {
      it('creates TrustedTypes', function() {
        let trustedType = this.security.blessHTML('<p>foo</p>');
        let expected = '<p>foo</p>';
        expect(trustedType.toString()).toBe(expected);
        expect(this.security.isTrustedHTML(trustedType)).toBe(true);
      });
    });

    describe('deepBless()', function() {
      it('blesses all strings in an object', function() {
        let input = {
          foo: '<p>foo</p>',
          bar: '<p>bar</p>'
        }
        let trustedType = this.security.deepBless(input);
        expect(trustedType.foo.toString()).toBe(input.foo);
        expect(this.security.isTrustedHTML(trustedType.foo)).toBe(true);
        expect(trustedType.bar.toString()).toBe(input.bar);
        expect(this.security.isTrustedHTML(trustedType.bar)).toBe(true);
      });

      it('ignores all non-strings', function() {
        let input = {
          foo: true,
          bar: []
        }
        let trustedType = this.security.deepBless(input);
        expect(this.security.isTrustedHTML(trustedType.foo)).toBe(false);
        expect(this.security.isTrustedHTML(trustedType.bar)).toBe(false);
      });
    });

    describe('isTrustedHTML()', function() {
      it('detects TrustedTypes', function() {
        let trustedType = this.security.blessHTML('<p>foo</p>');
        expect(this.security.isTrustedHTML(trustedType)).toBe(true);
      });

      it('detects non-TrustedTypes', function() {
        expect(this.security.isTrustedHTML('<p>foo</p>')).toBe(false);
      });
    });

    describe('replace()', function() {
      it('replaces values in TrustedTypes', function() {
        let trustedType = this.security.blessHTML('<p>foo</p>');
        let replacedTrustedType = this.security.replace(trustedType, 'foo', 'bar');
        let expected = '<p>bar</p>';
        expect(this.security.isTrustedHTML(replacedTrustedType)).toBe(true);
        expect(replacedTrustedType.toString()).toBe(expected);
      });

      it('replaces values in strings', function() {
        let input = '<p>foo</p>';
        let replacedInput = this.security.replace(input, 'foo', 'bar');
        let expected = '<p>bar</p>';
        expect(this.security.isTrustedHTML(replacedInput)).toBe(false);
        expect(replacedInput).toBe(expected);
      });
    });
  });

  describe('without Trusted Types support', function() {
    beforeEach(function() {
      this.security = new Security({});
    });

    describe('blessHTML()', function() {
      it('returns plain strings', function() {
        let trustedType = this.security.blessHTML('<p>foo</p>');
        let expected = '<p>foo</p>';
        expect(trustedType).toBe(expected);
        expect(this.security.isTrustedHTML(trustedType)).toBe(false);
      });
    });

    describe('deepBless()', function() {
      it('returns an object with plain strings', function() {
        let input = {
          foo: '<p>foo</p>',
          bar: '<p>bar</p>'
        }
        let trustedType = this.security.deepBless(input);
        expect(trustedType.foo).toBe(input.foo);
        expect(this.security.isTrustedHTML(trustedType.foo)).toBe(false);
        expect(trustedType.bar).toBe(input.bar);
        expect(this.security.isTrustedHTML(trustedType.bar)).toBe(false);
      });

      it('ignores all non-strings', function() {
        let input = {
          foo: true,
          bar: []
        }
        let trustedType = this.security.deepBless(input);
        expect(this.security.isTrustedHTML(trustedType.foo)).toBe(false);
        expect(this.security.isTrustedHTML(trustedType.bar)).toBe(false);
      });
    });

    describe('isTrustedHTML()', function() {
      it('returns false for strings passed through blessHTML', function() {
        let trustedType = this.security.blessHTML('<p>foo</p>');
        expect(this.security.isTrustedHTML(trustedType)).toBe(false);
      });

      it('returns false for plain strings', function() {
        expect(this.security.isTrustedHTML('<p>foo</p>')).toBe(false);
      });
    });

    describe('replace()', function() {
      it('replaces values in strings', function() {
        let input = '<p>foo</p>';
        let replacedInput = this.security.replace(input, 'foo', 'bar');
        let expected = '<p>bar</p>';
        expect(this.security.isTrustedHTML(replacedInput)).toBe(false);
        expect(replacedInput).toBe(expected);
      });
    });
  });
});
