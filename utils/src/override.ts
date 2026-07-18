import * as Y from 'yjs';
import { YConverter } from './convert.js';
import './types/yjs.d.ts';
import debug from 'debug';

const log = debug('y-utils:override');

Y.Text.prototype.toJSON = function () {
  log('Converting Y.Text to JSON');
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
  log('Setting text value:', value);
  if (this.doc) {
    this.doc.transact(() => {
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
  log('Getting text value');
  return this.toString();
};

Y.Text.prototype.setDate = function (value: Date) {
  log('Setting date value:', value);
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
  log('Getting date value');
  return new Date(this.toString());
};

Y.Text.prototype.setNumber = function (value: number) {
  log('Setting number value:', value);
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
  log('Getting number value');
  return Number(this.toString());
};

Y.Text.prototype.setBoolean = function (value: boolean) {
  log('Setting boolean value:', value);
  if (this.doc) {
    this.doc.transact(() => {
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
  log('Getting boolean value');
  return this.toJSON() as unknown as boolean;
};

const originalSet = Y.Map.prototype.set;
Y.Map.prototype.set = function <V extends keyof any>(key: V, value: any) {
  log('Setting map :', key);
  const execSet = () => {
    const currentValue = this.get(key) as any;
    value = YConverter.toYjs(value, currentValue as any);
    if (value === currentValue) {
      log('Value is the same as current value, skipping set for key:', key);
      return currentValue;
    }
    return originalSet.call(this, key, value);
  };
  return this.doc ? this.doc.transact(execSet) : execSet();
};

Y.Map.prototype.getValue = function <V extends keyof any>(key: V) {
  log('Getting map value for key:', key);
  const value = this.get(key);
  if (value instanceof Y.AbstractType) {
    return value.toJSON();
  }
  return value;
};

Y.Map.prototype.setObject = function <V extends Record<string, any>>(value: V) {
  log('Setting map object:', value);
  if (this.doc) {
    this.doc.transact(() => {
      YConverter.toYjs(value, this as any);
    });
  } else {
    YConverter.toYjs(value, this as any);
  }
};

const originalInsert = Y.Array.prototype.insert;
Y.Array.prototype.insert = function (index: number, value: any[]) {
  log('Inserting into array at index:', index);
  const insertValue = () => {
    return originalInsert.call(this, index, value.map(v => YConverter.toYjs(v)));
  };
  return this.doc ? this.doc.transact(insertValue) : insertValue();
};

const originalPush = Y.Array.prototype.push;
Y.Array.prototype.push = function (values: any[]) {
  log('Pushing values into array, length:', values.length);
  const pushValues = () => {
    const yValues = values.map((v) => YConverter.toYjs(v));
    return originalPush.call(this, yValues);
  };
  return this.doc ? this.doc.transact(pushValues) : pushValues();
};

Y.Array.prototype.replace = function (values: any[]) {
  log('Replacing array values, length:', values.length);
  const replaceValues = () => {
    const yValues = values.map((v, i) => YConverter.toYjs(v, this.get(i) as any));
    if (yValues.length < this.length) {
      this.delete(yValues.length, this.length - yValues.length);
    } else if (yValues.length > this.length) {
      this.insert(this.length, yValues.slice(this.length));
    }
  };
  return this.doc ? this.doc.transact(replaceValues) : replaceValues();
};

Y.Array.prototype.getValue = function (index: number) {
  log('Getting array value at index:', index);
  const value = this.get(index);
  if (value instanceof Y.AbstractType) {
    return value.toJSON();
  }
  return value;
}
