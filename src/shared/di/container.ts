import 'reflect-metadata';
import { container } from 'tsyringe';

import { DrizzleOrganizationRepository } from '../../infrastructure/repositories/DrizzleOrganizationRepository.js';
import { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository.js';
import { DrizzleBusinessUnitRepository } from '../../infrastructure/repositories/DrizzleBusinessUnitRepository.js';
import { IBusinessUnitRepository } from '../../domain/repositories/IBusinessUnitRepository.js';
import { DrizzleTeamRepository } from '../../infrastructure/repositories/DrizzleTeamRepository.js';
import { ITeamRepository } from '../../domain/repositories/ITeamRepository.js';
import { DrizzleUserRepository } from '../../infrastructure/repositories/DrizzleUserRepository.js';
import { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { DrizzleTeamUserRepository } from '../../infrastructure/repositories/DrizzleTeamUserRepository.js';
import { ITeamUserRepository } from '../../domain/repositories/ITeamUserRepository.js';
import { DrizzleBusinessUnitUserRepository } from '../../infrastructure/repositories/DrizzleBusinessUnitUserRepository.js';
import { IBusinessUnitUserRepository } from '../../domain/repositories/IBusinessUnitUserRepository.js';
import { DrizzleLoginAccessRepository } from '../../infrastructure/repositories/DrizzleLoginAccessRepository.js';
import { ILoginAccessRepository } from '../../domain/repositories/ILoginAccessRepository.js';
import { DrizzleAccessRepository } from '../../infrastructure/repositories/DrizzleAccessRepository.js';
import { IAccessRepository } from '../../domain/repositories/IAccessRepository.js';
import { DrizzleLoginUserRepository } from '../../infrastructure/repositories/DrizzleLoginUserRepository.js';
import { ILoginUserRepository } from '../../domain/repositories/ILoginUserRepository.js';
import { DrizzleTeamLabelRepository } from '../../infrastructure/repositories/DrizzleTeamLabelRepository.js';
import { ITeamLabelRepository } from '../../domain/repositories/ITeamLabelRepository.js';
import { DrizzleLoginAttemptEmailRepository } from '../../infrastructure/repositories/DrizzleLoginAttemptEmailRepository.js';
import { ILoginAttemptEmailRepository } from '../../domain/repositories/ILoginAttemptEmailRepository.js';
import { DrizzleTeamConversationUserRepository } from '../../infrastructure/repositories/DrizzleTeamConversationUserRepository.js';
import { ITeamConversationUserRepository } from '../../domain/repositories/ITeamConversationUserRepository.js';
import { DrizzleCategoryRepository } from '../../infrastructure/repositories/DrizzleCategoryRepository.js';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository.js';
import { DrizzleApiKeyRepository } from '../../infrastructure/repositories/DrizzleApiKeyRepository.js';
import { IApiKeyRepository } from '../../domain/repositories/IApiKeyRepository.js';

// Repositories
container.registerSingleton<IOrganizationRepository>('OrganizationRepository', DrizzleOrganizationRepository);
container.registerSingleton<IBusinessUnitRepository>('BusinessUnitRepository', DrizzleBusinessUnitRepository);
container.registerSingleton<ITeamRepository>('TeamRepository', DrizzleTeamRepository);
container.registerSingleton<IUserRepository>('UserRepository', DrizzleUserRepository);
container.registerSingleton<ITeamUserRepository>('TeamUserRepository', DrizzleTeamUserRepository);
container.registerSingleton<IBusinessUnitUserRepository>('BusinessUnitUserRepository', DrizzleBusinessUnitUserRepository);
container.registerSingleton<ILoginAccessRepository>('LoginAccessRepository', DrizzleLoginAccessRepository);
container.registerSingleton<IAccessRepository>('AccessRepository', DrizzleAccessRepository);
container.registerSingleton<ILoginUserRepository>('LoginUserRepository', DrizzleLoginUserRepository);
container.registerSingleton<ITeamLabelRepository>('TeamLabelRepository', DrizzleTeamLabelRepository);
container.registerSingleton<ILoginAttemptEmailRepository>('LoginAttemptEmailRepository', DrizzleLoginAttemptEmailRepository);
container.registerSingleton<ITeamConversationUserRepository>('TeamConversationUserRepository', DrizzleTeamConversationUserRepository);
container.registerSingleton<ICategoryRepository>('CategoryRepository', DrizzleCategoryRepository);
container.registerSingleton<IApiKeyRepository>('ApiKeyRepository', DrizzleApiKeyRepository);

export { container };
