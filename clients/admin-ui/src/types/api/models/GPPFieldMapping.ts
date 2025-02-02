/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { GPPMechanismMapping } from "./GPPMechanismMapping";

/**
 * A base template for all other Fides Schemas to inherit from.
 */
export type GPPFieldMapping = {
  region: string;
  notice?: Array<string>;
  mechanism?: Array<GPPMechanismMapping>;
};
