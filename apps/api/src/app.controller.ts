import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @Public()
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'ultimate-saas-api',
      timestamp: new Date().toISOString(),
    };
  }
}
