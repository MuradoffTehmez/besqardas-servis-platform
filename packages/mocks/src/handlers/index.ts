import { authHandlers } from './auth';
import { catalogHandlers } from './catalog';
import { commerceHandlers } from './commerce';
import { demoHandlers } from './presentation';
export const handlers = [...authHandlers, ...catalogHandlers, ...commerceHandlers, ...demoHandlers];
