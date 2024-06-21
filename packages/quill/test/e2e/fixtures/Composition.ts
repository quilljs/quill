import type {
  CDPSession,
  Page,
  PlaywrightWorkerOptions,
} from '@playwright/test';

abstract class CompositionSession {
  abstract update(key: string): Promise<void>;
  abstract commit(committedText: string): Promise<void>;
  abstract cancel(): Promise<void>;

  protected composingData = '';

  constructor(protected page: Page) {}

  protected async withKeyboardEvents(
    key: string,
    callback: () => Promise<void>,
  ) {
    const activeElement = this.page.locator('*:focus');

    await activeElement.dispatchEvent('keydown', { key });
    await callback();
    await activeElement.dispatchEvent('keyup', { key });
  }
}

class ChromiumCompositionSession extends CompositionSession {
  constructor(
    page: Page,
    private session: CDPSession,
  ) {
    super(page);
  }

  async update(key: string) {
    await this.withKeyboardEvents(key, async () => {
      this.composingData += key;
      this.updateComposition();
    });
  }

  async commit(committedText: string) {
    await this.withKeyboardEvents('Space', async () => {
      await this.session.send('Input.insertText', {
        text: committedText,
      });
    });
  }

  async cancel() {
    await this.withKeyboardEvents('Escape', async () => {
      this.composingData = '';
      await this.updateComposition();
    });
  }

  private async updateComposition() {
    await this.session.send('Input.imeSetComposition', {
      selectionStart: this.composingData.length,
      selectionEnd: this.composingData.length,
      text: this.composingData,
    });
  }
}

class Composition {
  constructor(
    private page: Page,
    private browserName: PlaywrightWorkerOptions['browserName'],
  ) {}

  async start() {
    switch (this.browserName) {
      case 'chromium': {
        const session = await this.page.context().newCDPSession(this.page);
        return new ChromiumCompositionSession(this.page, session);
      }
      default:
        throw new Error(`Unsupported browser: ${this.browserName}`);
    }
  }
}

export default Composition;
