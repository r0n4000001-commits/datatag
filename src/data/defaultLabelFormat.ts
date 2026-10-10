import defaultFormatJson from './defaultLabelFormat.json';
import { LabelFormatConfig } from '../types';

export const YOREME_DEFAULT_LABEL_FORMAT_CONFIG: LabelFormatConfig = {
  ...(defaultFormatJson as LabelFormatConfig),
};
