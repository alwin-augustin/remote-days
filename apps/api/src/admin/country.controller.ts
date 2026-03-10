import { FastifyRequest, FastifyReply } from 'fastify';
import { CountryService } from '../services/country.service';
import { AppError } from '../errors/app-error';

export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  getCountriesHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await this.countryService.getAllCountries();
    return reply.code(200).send({ data, total: data.length });
  };

  createCountryHandler = async (
    request: FastifyRequest<{ Body: { country_code: string; max_remote_days: number } }>,
    reply: FastifyReply
  ) => {
    const { country_code, max_remote_days } = request.body;

    if (!country_code || max_remote_days === undefined) {
      throw new AppError('Country code and max remote days are required', 400);
    }

    try {
      const country = await this.countryService.addCountry(country_code, max_remote_days);
      return reply.code(201).send(country);
    } catch (err: any) {
      if (err.code === '23505') {
        throw new AppError('Country already exists', 409);
      }
      throw err;
    }
  };

  updateCountryHandler = async (
    request: FastifyRequest<{ Params: { code: string }; Body: { max_remote_days: number } }>,
    reply: FastifyReply
  ) => {
    const { code } = request.params;
    const { max_remote_days } = request.body;

    if (max_remote_days === undefined) {
      throw new AppError('Max remote days is required', 400);
    }

    const updatedCountry = await this.countryService.updateThreshold(code, max_remote_days);
    if (!updatedCountry) {
      throw new AppError('Country not found', 404);
    }
    return reply.code(200).send(updatedCountry);
  };

  deleteCountryHandler = async (
    request: FastifyRequest<{ Params: { code: string } }>,
    reply: FastifyReply
  ) => {
    const { code } = request.params;
    const deleted = await this.countryService.deleteCountry(code);
    if (!deleted) {
      throw new AppError('Country not found', 404);
    }
    return reply.code(204).send();
  };
}
