// Since BaseMT5EventDto already handles all validation conditionally,
// we just need to export it as the main DTO type for all MT5 events.
// The conditional validation in BaseMT5EventDto will ensure the right fields
// are validated for each event type.

import { BaseMT5EventDto } from './base-mt5-event.dto';

// Type aliases for the supported MT5 event types
export type MT5OpenEventDto = BaseMT5EventDto;
export type MT5CloseEventDto = BaseMT5EventDto;
export type MT5OrderSLTPUpdateEventDto = BaseMT5EventDto;
export type MT5PositionSLTPUpdateEventDto = BaseMT5EventDto;

// Union type for all event DTOs - all use BaseMT5EventDto
export type MT5EventDto = BaseMT5EventDto;
