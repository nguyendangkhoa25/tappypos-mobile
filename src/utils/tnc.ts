/**
 * TappyPOS — Terms & Conditions
 *
 * Structured data for the T&C screen and the registration checkbox modal.
 * Update VERSION + EFFECTIVE_DATE whenever content changes.
 *
 * Each section has a `title` i18n key and an `items` array of i18n keys.
 * The screen renderer reads `t(title)` and `t(item)` for each entry.
 */

export const TNC_VERSION = '2.0';
export const TNC_EFFECTIVE_DATE = '2025-06-01';

export type TnCSection = {
  /** i18n key for the section heading */
  titleKey: string;
  /** i18n keys for each clause/bullet under the section */
  itemKeys: string[];
};

export const TNC_SECTIONS: TnCSection[] = [
  {
    titleKey: 'tnc.s1.title',
    itemKeys: [
      'tnc.s1.i1',
      'tnc.s1.i2',
      'tnc.s1.i3',
    ],
  },
  {
    titleKey: 'tnc.s2.title',
    itemKeys: [
      'tnc.s2.i1',
      'tnc.s2.i2',
      'tnc.s2.i3',
    ],
  },
  {
    titleKey: 'tnc.s3.title',
    itemKeys: [
      'tnc.s3.i1',
      'tnc.s3.i2',
      'tnc.s3.i3',
      'tnc.s3.i4',
    ],
  },
  {
    titleKey: 'tnc.s4.title',
    itemKeys: [
      'tnc.s4.i1',
      'tnc.s4.i2',
      'tnc.s4.i3',
    ],
  },
  {
    titleKey: 'tnc.s5.title',
    itemKeys: [
      'tnc.s5.i1',
      'tnc.s5.i2',
      'tnc.s5.i3',
      'tnc.s5.i4',
    ],
  },
  {
    titleKey: 'tnc.s6.title',
    itemKeys: [
      'tnc.s6.i1',
      'tnc.s6.i2',
      'tnc.s6.i3',
    ],
  },
  {
    titleKey: 'tnc.s7.title',
    itemKeys: [
      'tnc.s7.i1',
      'tnc.s7.i2',
      'tnc.s7.i3',
      'tnc.s7.i4',
    ],
  },
  {
    titleKey: 'tnc.s8.title',
    itemKeys: [
      'tnc.s8.i1',
      'tnc.s8.i2',
      'tnc.s8.i3',
      'tnc.s8.i4',
    ],
  },
  {
    titleKey: 'tnc.s9.title',
    itemKeys: [
      'tnc.s9.i1',
      'tnc.s9.i2',
      'tnc.s9.i3',
      'tnc.s9.i4',
    ],
  },
  {
    titleKey: 'tnc.s10.title',
    itemKeys: [
      'tnc.s10.i1',
      'tnc.s10.i2',
    ],
  },
  {
    titleKey: 'tnc.s11.title',
    itemKeys: [
      'tnc.s11.i1',
      'tnc.s11.i2',
      'tnc.s11.i3',
    ],
  },
  {
    titleKey: 'tnc.s12.title',
    itemKeys: [
      'tnc.s12.i1',
      'tnc.s12.i2',
      'tnc.s12.i3',
    ],
  },
  {
    titleKey: 'tnc.s13.title',
    itemKeys: [
      'tnc.s13.i1',
      'tnc.s13.i2',
    ],
  },
  {
    titleKey: 'tnc.s14.title',
    itemKeys: [
      'tnc.s14.i1',
      'tnc.s14.i2',
      'tnc.s14.i3',
    ],
  },
];
