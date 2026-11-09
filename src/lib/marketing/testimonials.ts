/**
 * Real student testimonials, once there are any.
 *
 * Empty on purpose — see the comment beside `productJsonLd` in page.tsx for
 * why this app does not fabricate social proof. The carousel that reads this
 * array renders honest placeholder slides when it is empty, so the layout
 * is already live and ready: adding a testimonial here is the entire launch
 * step, no component changes required.
 */
export interface Testimonial {
  quote: string;
  name: string;
  /** e.g. "Grade 12, STEM" or "BS Nursing, 2nd year" — self-reported, never invented. */
  detail: string;
}

export const TESTIMONIALS: Testimonial[] = [];
