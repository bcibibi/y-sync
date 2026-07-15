import * as Y from 'yjs';
import { YConverter } from './convert.js';
import './types/yjs.d.ts';

Y.Text.prototype.toJSON = function () {
  if (this.getAttribute('__type') === 'date') {
    return new Date(this.toString()) as unknown as string;
  }
  if (this.getAttribute('__type') === 'number') {
    return Number(this.toString()) as unknown as string;
  }
  if (this.getAttribute('__type') === 'boolean') {
    return (this.toString() === 'true') as unknown as string;
  }
  if (this.getAttribute('__type') === 'html') {
    return this.toHtml ? this.toHtml() : this.toString();
  }
  return this.toString()
};

Y.Text.prototype.setText = function (value: string) {
  if (this.doc) {
    this.doc?.transact(() => {
      this.delete(0, this.length);
      this.insert(0, value);
      this.removeAttribute('__type');
    });
  } else {
    this.insert(0, value);
    this.removeAttribute('__type');
  }
};

Y.Text.prototype.getText = function (): string {
  return this.toString();
};

Y.Text.prototype.setDate = function (value: Date) {
  if (this.doc) {
    this.doc.transact(() => {
      this.delete(0, this.length);
      this.insert(0, value.toISOString());
      this.setAttribute('__type', 'date');
    });
  } else {
    this.insert(0, value.toISOString());
    this.setAttribute('__type', 'date');
  }
};

Y.Text.prototype.getDate = function (): Date {
  return new Date(this.toString());
};

Y.Text.prototype.setNumber = function (value: number) {
  if (this.doc) {
    this.doc.transact(() => {
      this.delete(0, this.length);
      this.insert(0, String(value));
      this.setAttribute('__type', 'number');
    });
  } else {
    this.insert(0, String(value));
    this.setAttribute('__type', 'number');
  }
};

Y.Text.prototype.getNumber = function (): number {
  return Number(this.toString());
};

Y.Text.prototype.setBoolean = function (value: boolean) {
  if (this.doc) {
    this.doc?.transact(() => {
      this.delete(0, this.length);
      this.insert(0, value.toString());
      this.setAttribute('__type', 'boolean');
    });
  } else {
    this.insert(0, value.toString());
    this.setAttribute('__type', 'boolean');
  }
};

Y.Text.prototype.getBoolean = function (): boolean {
  return this.toJSON() as unknown as boolean;
};

const originalSet = Y.Map.prototype.set;
Y.Map.prototype.set = function <V extends keyof any>(key: V, value: any) {
  const currentValue = this.get(key) as any;
  value = YConverter.toYjs(value, currentValue as any);
  if (value === currentValue) {
    return currentValue;
  }
  return originalSet.call(this, key, value);
};

Y.Map.prototype.getValue = function <V extends keyof any>(key: V) {
  const value = this.get(key);
  if (value instanceof Y.AbstractType) {
    return value.toJSON();
  }
  return value;
};

const originalInsert = Y.Array.prototype.insert;
Y.Array.prototype.insert = function (index: number, value: any) {
  value = YConverter.toYjs(value);
  return originalInsert.call(this, index, value);
};

Y.Array.prototype.getValue = function (index: number) {
  const value = this.get(index);
  if (value instanceof Y.AbstractType) {
    return value.toJSON();
  }
  return value;
}

