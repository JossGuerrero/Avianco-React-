import type { Promocion } from '../../../domain/entities/Promocion';
import type { PromocionRepository } from '../../../domain/ports/PromocionRepository';
import { promocionVigente } from '../../../domain/services/promocion.service';

export class GetPromocionesUseCase {
  private readonly promocionRepository: PromocionRepository;

  constructor(promocionRepository: PromocionRepository) {
    this.promocionRepository = promocionRepository;
  }

  async execute(soloActivas = true): Promise<Promocion[]> {
    const promociones = await this.promocionRepository.getPromociones(soloActivas);
    return soloActivas ? promociones.filter(promocionVigente) : promociones;
  }
}
