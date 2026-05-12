import { IsString, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(3)
  name!: string;
}
