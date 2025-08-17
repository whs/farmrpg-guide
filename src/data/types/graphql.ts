/* eslint-disable */
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Date (isoformat) */
  Date: { input: any; output: any; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  /** The `ID` scalar type represents a unique identifier, often used to refetch an object or as key for a cache. The ID type appears in a JSON response as a String; however, it is not intended to be human-readable. When expected as an input type, any string (such as `"4"`) or integer (such as `4`) input value will be accepted as an ID. */
  GlobalID: { input: any; output: any; }
};

export type BorgenItem = {
  __typename?: 'BorgenItem';
  date: Scalars['Date']['output'];
  id: Scalars['Int']['output'];
  item: Item;
  price?: Maybe<Scalars['Int']['output']>;
};


export type BorgenItemItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type BorgenItemFilter = {
  date?: InputMaybe<Scalars['Date']['input']>;
  item?: InputMaybe<DjangoModelFilterInput>;
};

export type CardsTrade = {
  __typename?: 'CardsTrade';
  clubsQuantity?: Maybe<Scalars['Int']['output']>;
  diamondsQuantity?: Maybe<Scalars['Int']['output']>;
  heartsQuantity?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  isDisabled: Scalars['Boolean']['output'];
  jokerQuantity?: Maybe<Scalars['Int']['output']>;
  outputItem: Item;
  outputQuantity: Scalars['Int']['output'];
  spadesQuantity?: Maybe<Scalars['Int']['output']>;
};


export type CardsTradeOutputItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type CardsTradeFilter = {
  id?: InputMaybe<Scalars['Int']['input']>;
  isDisabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CardsTradeOrder = {
  id?: InputMaybe<Ordering>;
};

export type CommunityCenter = {
  __typename?: 'CommunityCenter';
  date: Scalars['Date']['output'];
  id: Scalars['Int']['output'];
  inputItem: Item;
  inputQuantity: Scalars['Int']['output'];
  outputGold?: Maybe<Scalars['Int']['output']>;
  outputItem?: Maybe<Item>;
  outputQuantity?: Maybe<Scalars['Int']['output']>;
  progress: Scalars['Int']['output'];
};


export type CommunityCenterInputItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type CommunityCenterOutputItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type CommunityCenterFilter = {
  date?: InputMaybe<Scalars['Date']['input']>;
  inputItem?: InputMaybe<DjangoModelFilterInput>;
  outputItem?: InputMaybe<DjangoModelFilterInput>;
};

export type CommunityCenterOrder = {
  date?: InputMaybe<Ordering>;
  id?: InputMaybe<Ordering>;
};

export type DjangoModelFilterInput = {
  pk: Scalars['ID']['input'];
};

export type DropRates = {
  __typename?: 'DropRates';
  ironDepot?: Maybe<Scalars['Boolean']['output']>;
  items: Array<DropRatesItem>;
  location?: Maybe<Location>;
  manualFishing?: Maybe<Scalars['Boolean']['output']>;
  runecube?: Maybe<Scalars['Boolean']['output']>;
  seed?: Maybe<Item>;
  silverPerHit?: Maybe<Scalars['Float']['output']>;
  xpPerHit?: Maybe<Scalars['Float']['output']>;
};


export type DropRatesSeedArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type DropRatesItem = {
  __typename?: 'DropRatesItem';
  dropRates: DropRates;
  item: Item;
  rate: Scalars['Float']['output'];
};


export type DropRatesItemItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type Emblem = {
  __typename?: 'Emblem';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  image: Scalars['String']['output'];
  keywords: Scalars['String']['output'];
  name: Scalars['String']['output'];
  type?: Maybe<Scalars['String']['output']>;
};

export type EmblemFilter = {
  id?: InputMaybe<Scalars['ID']['input']>;
  keywords?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  nonStaff?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type Item = {
  __typename?: 'Item';
  baseYieldMinutes: Scalars['Int']['output'];
  borgenItems: Array<BorgenItem>;
  buyPrice: Scalars['Int']['output'];
  canBuy: Scalars['Boolean']['output'];
  canCook: Scalars['Boolean']['output'];
  canCraft: Scalars['Boolean']['output'];
  canFleaMarket: Scalars['Boolean']['output'];
  canLocksmith: Scalars['Boolean']['output'];
  canMail: Scalars['Boolean']['output'];
  canMaster: Scalars['Boolean']['output'];
  canSell: Scalars['Boolean']['output'];
  cardsTrades: Array<CardsTrade>;
  communityCenterInputs: Array<CommunityCenter>;
  communityCenterOutputs: Array<CommunityCenter>;
  cookingLevel?: Maybe<Scalars['Int']['output']>;
  cookingRecipeCookable?: Maybe<Item>;
  cookingRecipeItem?: Maybe<Item>;
  craftingLevel: Scalars['Int']['output'];
  description: Scalars['String']['output'];
  dropRates: Array<DropRates>;
  dropRatesItems: Array<DropRatesItem>;
  exchangeCenterInputs: Array<Trade>;
  exchangeCenterOutputs: Array<Trade>;
  fleaMarketPrice?: Maybe<Scalars['Int']['output']>;
  fleaMarketRotate: Scalars['Boolean']['output'];
  fromEvent: Scalars['Boolean']['output'];
  id: Scalars['Int']['output'];
  image: Scalars['String']['output'];
  locationItems: Array<LocationItem>;
  locksmithGold?: Maybe<Scalars['Int']['output']>;
  locksmithGrabBag: Scalars['Boolean']['output'];
  locksmithItems: Array<LocksmithItem>;
  locksmithKey?: Maybe<Item>;
  locksmithKeyItems: Array<Item>;
  locksmithOutputItems: Array<LocksmithItem>;
  manualFishingOnly: Scalars['Boolean']['output'];
  manualProductions: Array<ManualProduction>;
  minMailableLevel: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  npcItems: Array<NpcItem>;
  npcRewards: Array<NpcReward>;
  passwordItems: Array<PasswordItem>;
  petItems: Array<PetItem>;
  profileBackgroundCostItems: Array<ProfileBackground>;
  quizRewards: Array<QuizReward>;
  recipeIngredientItems: Array<RecipeItem>;
  recipeItems: Array<RecipeItem>;
  requiredForQuests: Array<QuestItemRequired>;
  rewardForQuests: Array<QuestItemReward>;
  sellPrice: Scalars['Int']['output'];
  skillLevelRewards: Array<SkillLevelReward>;
  templeRewardItems: Array<TempleRewardItem>;
  templeRewards: Array<TempleReward>;
  towerRewards: Array<TowerReward>;
  type: Scalars['String']['output'];
  wishingWellInputItems: Array<WishingWellItem>;
  wishingWellOutputItems: Array<WishingWellItem>;
  xp: Scalars['Int']['output'];
};


export type ItemCardsTradesArgs = {
  filters?: InputMaybe<CardsTradeFilter>;
  order?: InputMaybe<CardsTradeOrder>;
};


export type ItemCommunityCenterInputsArgs = {
  order?: InputMaybe<CommunityCenterOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ItemCommunityCenterOutputsArgs = {
  order?: InputMaybe<CommunityCenterOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ItemCookingRecipeCookableArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ItemCookingRecipeItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ItemLocksmithKeyArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ItemLocksmithKeyItemsArgs = {
  filters?: InputMaybe<ItemFilter>;
  order?: InputMaybe<ItemOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ItemPetItemsArgs = {
  order?: InputMaybe<PetItemOrder>;
};


export type ItemSkillLevelRewardsArgs = {
  filters?: InputMaybe<SkillLevelRewardFilter>;
  order?: InputMaybe<SkillLevelRewardOrder>;
};


export type ItemTowerRewardsArgs = {
  order?: InputMaybe<TowerRewardOrder>;
};

export type ItemFilter = {
  canMail?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type ItemOrder = {
  createdAt?: InputMaybe<Ordering>;
  id?: InputMaybe<Ordering>;
  name?: InputMaybe<Ordering>;
};

export type Location = {
  __typename?: 'Location';
  baseDropRate?: Maybe<Scalars['Float']['output']>;
  dropRates: Array<DropRates>;
  gameId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  image: Scalars['String']['output'];
  locationItems: Array<LocationItem>;
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type LocationFilter = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type LocationItem = {
  __typename?: 'LocationItem';
  item: Item;
  location: Location;
  sometimes: Scalars['Boolean']['output'];
};


export type LocationItemItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type LocationOrder = {
  gameId?: InputMaybe<Ordering>;
  id?: InputMaybe<Ordering>;
  name?: InputMaybe<Ordering>;
  type?: InputMaybe<Ordering>;
};

export type LocksmithItem = {
  __typename?: 'LocksmithItem';
  item: Item;
  outputItem: Item;
  quantityMax?: Maybe<Scalars['Int']['output']>;
  quantityMin?: Maybe<Scalars['Int']['output']>;
};


export type LocksmithItemItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type LocksmithItemOutputItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ManualProduction = {
  __typename?: 'ManualProduction';
  href?: Maybe<Scalars['String']['output']>;
  image: Scalars['String']['output'];
  item: Item;
  lineOne: Scalars['String']['output'];
  lineTwo: Scalars['String']['output'];
  sort: Scalars['Int']['output'];
  value: Scalars['String']['output'];
};


export type ManualProductionItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type Npc = {
  __typename?: 'NPC';
  id: Scalars['Int']['output'];
  image: Scalars['String']['output'];
  isAvailable: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  npcItems: Array<NpcItem>;
  npcRewards: Array<NpcReward>;
  quests: Array<Quest>;
  shortName?: Maybe<Scalars['String']['output']>;
};


export type NpcNpcItemsArgs = {
  filters?: InputMaybe<NpcItemFilter>;
  order?: InputMaybe<NpcItemOrder>;
};


export type NpcNpcRewardsArgs = {
  filters?: InputMaybe<NpcRewardFilter>;
  order?: InputMaybe<NpcRewardOrder>;
};


export type NpcQuestsArgs = {
  filters?: InputMaybe<QuestFilter>;
  order?: InputMaybe<QuestOrder>;
};

export type NpcFilter = {
  id?: InputMaybe<Scalars['ID']['input']>;
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  shortName?: InputMaybe<Scalars['String']['input']>;
};

export type NpcItem = {
  __typename?: 'NPCItem';
  item: Item;
  npc: Npc;
  relationship: Scalars['String']['output'];
};


export type NpcItemItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type NpcItemFilter = {
  item?: InputMaybe<ItemFilter>;
  npc?: InputMaybe<NpcFilter>;
  relationship?: InputMaybe<Scalars['String']['input']>;
};

export type NpcItemOrder = {
  item?: InputMaybe<ItemOrder>;
  npc?: InputMaybe<NpcOrder>;
  relationship?: InputMaybe<Ordering>;
};

export type NpcOrder = {
  id?: InputMaybe<Ordering>;
  name?: InputMaybe<Ordering>;
  shortName?: InputMaybe<Ordering>;
};

export type NpcReward = {
  __typename?: 'NPCReward';
  item: Item;
  level: Scalars['Int']['output'];
  npc: Npc;
  order: Scalars['Int']['output'];
  quantity: Scalars['Int']['output'];
};


export type NpcRewardItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type NpcRewardFilter = {
  item?: InputMaybe<ItemFilter>;
  npc?: InputMaybe<NpcFilter>;
};

export type NpcRewardOrder = {
  item?: InputMaybe<ItemOrder>;
  level?: InputMaybe<Ordering>;
  npc?: InputMaybe<NpcOrder>;
  order?: InputMaybe<Ordering>;
};

export type OffsetPaginationInput = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export enum Ordering {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type Password = {
  __typename?: 'Password';
  clue1?: Maybe<Scalars['String']['output']>;
  clue2?: Maybe<Scalars['String']['output']>;
  clue3?: Maybe<Scalars['String']['output']>;
  group: PasswordGroup;
  id: Scalars['Int']['output'];
  password: Scalars['String']['output'];
  rewardGold: Scalars['Int']['output'];
  rewardItems: Array<PasswordItem>;
  rewardSilver: Scalars['Int']['output'];
};

export type PasswordFilter = {
  hasClues?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
};

export type PasswordGroup = {
  __typename?: 'PasswordGroup';
  name: Scalars['String']['output'];
  passwords: Array<Password>;
};


export type PasswordGroupPasswordsArgs = {
  filters?: InputMaybe<PasswordFilter>;
};

export type PasswordGroupFilter = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type PasswordItem = {
  __typename?: 'PasswordItem';
  item: Item;
  password: Password;
  quantity: Scalars['Int']['output'];
};


export type PasswordItemItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type Pet = {
  __typename?: 'Pet';
  cost: Scalars['Float']['output'];
  id: Scalars['Int']['output'];
  image: Scalars['String']['output'];
  name: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  petItems: Array<PetItem>;
  requiredCookingLevel: Scalars['Int']['output'];
  requiredCraftingLevel: Scalars['Int']['output'];
  requiredExploringLevel: Scalars['Int']['output'];
  requiredFarmingLevel: Scalars['Int']['output'];
  requiredFishingLevel: Scalars['Int']['output'];
};


export type PetPetItemsArgs = {
  order?: InputMaybe<PetItemOrder>;
};

export type PetFilter = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type PetItem = {
  __typename?: 'PetItem';
  id: Scalars['Int']['output'];
  item: Item;
  level: Scalars['Int']['output'];
  order: Scalars['Int']['output'];
  pet: Pet;
};


export type PetItemItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type PetItemOrder = {
  level?: InputMaybe<Ordering>;
  order?: InputMaybe<Ordering>;
  pet?: InputMaybe<PetOrder>;
};

export type PetOrder = {
  id?: InputMaybe<Ordering>;
  name?: InputMaybe<Ordering>;
  order?: InputMaybe<Ordering>;
};

export type ProfileBackground = {
  __typename?: 'ProfileBackground';
  costGold?: Maybe<Scalars['Int']['output']>;
  costItem?: Maybe<Item>;
  costItemQuantity?: Maybe<Scalars['Int']['output']>;
  costSilver?: Maybe<Scalars['Float']['output']>;
  darkImage: Scalars['String']['output'];
  gameId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['GlobalID']['output'];
  lightImage: Scalars['String']['output'];
  name: Scalars['String']['output'];
};


export type ProfileBackgroundCostItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ProfileBackgroundFilter = {
  gameId?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type ProfileBackgroundOrder = {
  gameId?: InputMaybe<Ordering>;
  id?: InputMaybe<Ordering>;
  name?: InputMaybe<Ordering>;
};

export type Query = {
  __typename?: 'Query';
  borgenItems: Array<BorgenItem>;
  cardsTrades: Array<CardsTrade>;
  communityCenters: Array<CommunityCenter>;
  emblems: Array<Emblem>;
  items: Array<Item>;
  locations: Array<Location>;
  npcs: Array<Npc>;
  passwordGroups: Array<PasswordGroup>;
  passwords: Array<Password>;
  pets: Array<Pet>;
  profileBackgrounds: Array<ProfileBackground>;
  questlines: Array<Questline>;
  quests: Array<Quest>;
  quizzes: Array<Quiz>;
  skillLevelRewards: Array<SkillLevelReward>;
  towerRewards: Array<TowerReward>;
  trades: Array<Trade>;
  updates: Array<Update>;
};


export type QueryBorgenItemsArgs = {
  filters?: InputMaybe<BorgenItemFilter>;
};


export type QueryCardsTradesArgs = {
  filters?: InputMaybe<CardsTradeFilter>;
  order?: InputMaybe<CardsTradeOrder>;
};


export type QueryCommunityCentersArgs = {
  filters?: InputMaybe<CommunityCenterFilter>;
  order?: InputMaybe<CommunityCenterOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryEmblemsArgs = {
  filters?: InputMaybe<EmblemFilter>;
};


export type QueryItemsArgs = {
  filters?: InputMaybe<ItemFilter>;
  order?: InputMaybe<ItemOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryLocationsArgs = {
  filters?: InputMaybe<LocationFilter>;
  order?: InputMaybe<LocationOrder>;
};


export type QueryNpcsArgs = {
  filters?: InputMaybe<NpcFilter>;
  order?: InputMaybe<NpcOrder>;
};


export type QueryPasswordGroupsArgs = {
  filters?: InputMaybe<PasswordGroupFilter>;
};


export type QueryPasswordsArgs = {
  filters?: InputMaybe<PasswordFilter>;
};


export type QueryPetsArgs = {
  filters?: InputMaybe<PetFilter>;
  order?: InputMaybe<PetOrder>;
};


export type QueryProfileBackgroundsArgs = {
  filters?: InputMaybe<ProfileBackgroundFilter>;
  order?: InputMaybe<ProfileBackgroundOrder>;
};


export type QueryQuestlinesArgs = {
  filters?: InputMaybe<QuestlineFilter>;
  order?: InputMaybe<QuestlineOrder>;
};


export type QueryQuestsArgs = {
  filters?: InputMaybe<QuestFilter>;
  order?: InputMaybe<QuestOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryQuizzesArgs = {
  filters?: InputMaybe<QuizFilter>;
};


export type QuerySkillLevelRewardsArgs = {
  filters?: InputMaybe<SkillLevelRewardFilter>;
  order?: InputMaybe<SkillLevelRewardOrder>;
};


export type QueryTowerRewardsArgs = {
  filters?: InputMaybe<TowerRewardFilter>;
  order?: InputMaybe<TowerRewardOrder>;
};


export type QueryTradesArgs = {
  order?: InputMaybe<TradeOrder>;
};


export type QueryUpdatesArgs = {
  filters?: InputMaybe<UpdateFilter>;
};

export type Quest = {
  __typename?: 'Quest';
  name: string;
  author?: Maybe<Scalars['String']['output']>;
  cleanDescription: Scalars['String']['output'];
  cleanTitle: Scalars['String']['output'];
  completedCount: Scalars['Int']['output'];
  dependentQuests: Array<Quest>;
  description: Scalars['String']['output'];
  endDate?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['Int']['output'];
  isHidden: Scalars['Boolean']['output'];
  mainQuest: Scalars['Boolean']['output'];
  npc: Scalars['String']['output'];
  npcImg: Scalars['String']['output'];
  pred?: Maybe<Quest>;
  questlines: Array<QuestlineStep>;
  requiredCookingLevel: Scalars['Int']['output'];
  requiredCraftingLevel: Scalars['Int']['output'];
  requiredExploringLevel: Scalars['Int']['output'];
  requiredFarmingLevel: Scalars['Int']['output'];
  requiredFishingLevel: Scalars['Int']['output'];
  requiredItems: Array<QuestItemRequired>;
  requiredNpc?: Maybe<Npc>;
  requiredNpcLevel: Scalars['Int']['output'];
  requiredSilver: Scalars['Float']['output'];
  requiredTowerLevel: Scalars['Int']['output'];
  rewardGold: Scalars['Int']['output'];
  rewardItems: Array<QuestItemReward>;
  rewardSilver: Scalars['Float']['output'];
  startDate?: Maybe<Scalars['DateTime']['output']>;
  title: Scalars['String']['output'];
};


export type QuestDependentQuestsArgs = {
  filters?: InputMaybe<QuestFilter>;
  order?: InputMaybe<QuestOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuestPredArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuestRequiredItemsArgs = {
  order?: InputMaybe<QuestItemRequiredOrder>;
};


export type QuestRewardItemsArgs = {
  order?: InputMaybe<QuestItemRewardOrder>;
};

export type QuestFilter = {
  cleanTitle?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type QuestItemRequired = {
  __typename?: 'QuestItemRequired';
  id: Scalars['Int']['output'];
  item: Item;
  order: Scalars['Int']['output'];
  quantity: Scalars['Int']['output'];
  quest: Quest;
};


export type QuestItemRequiredItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuestItemRequiredQuestArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type QuestItemRequiredOrder = {
  id?: InputMaybe<Ordering>;
  item?: InputMaybe<ItemOrder>;
  order?: InputMaybe<Ordering>;
  quantity?: InputMaybe<Ordering>;
  quest?: InputMaybe<QuestOrder>;
};

export type QuestItemReward = {
  __typename?: 'QuestItemReward';
  id: Scalars['Int']['output'];
  item: Item;
  order: Scalars['Int']['output'];
  quantity: Scalars['Int']['output'];
  quest: Quest;
};


export type QuestItemRewardItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuestItemRewardQuestArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type QuestItemRewardOrder = {
  id?: InputMaybe<Ordering>;
  item?: InputMaybe<ItemOrder>;
  order?: InputMaybe<Ordering>;
  quantity?: InputMaybe<Ordering>;
  quest?: InputMaybe<QuestOrder>;
};

export type QuestOrder = {
  cleanTitle?: InputMaybe<Ordering>;
  createdAt?: InputMaybe<Ordering>;
  id?: InputMaybe<Ordering>;
  title?: InputMaybe<Ordering>;
};

export type Questline = {
  __typename?: 'Questline';
  automatic: Scalars['Boolean']['output'];
  id: Scalars['Int']['output'];
  image: Scalars['String']['output'];
  steps: Array<QuestlineStep>;
  title: Scalars['String']['output'];
};

export type QuestlineFilter = {
  id?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type QuestlineOrder = {
  id?: InputMaybe<Ordering>;
  title?: InputMaybe<Ordering>;
};

export type QuestlineStep = {
  __typename?: 'QuestlineStep';
  order: Scalars['Int']['output'];
  quest: Quest;
  questline: Questline;
};


export type QuestlineStepQuestArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type Quiz = {
  __typename?: 'Quiz';
  answers: Array<QuizAnswer>;
  description: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  rewards: Array<QuizReward>;
};

export type QuizAnswer = {
  __typename?: 'QuizAnswer';
  answer1: Scalars['String']['output'];
  answer2: Scalars['String']['output'];
  answer3: Scalars['String']['output'];
  answer4: Scalars['String']['output'];
  correct: Scalars['Int']['output'];
  displayOrder: Scalars['Int']['output'];
  isHidden: Scalars['Boolean']['output'];
  question: Scalars['String']['output'];
  quiz: Quiz;
};

export type QuizFilter = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type QuizReward = {
  __typename?: 'QuizReward';
  item: Item;
  quantity: Scalars['Int']['output'];
  quiz: Quiz;
  score: Scalars['Int']['output'];
};


export type QuizRewardItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type RecipeItem = {
  __typename?: 'RecipeItem';
  ingredientItem: Item;
  item: Item;
  quantity: Scalars['Int']['output'];
};


export type RecipeItemIngredientItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type RecipeItemItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type SkillLevelReward = {
  __typename?: 'SkillLevelReward';
  ak?: Maybe<Scalars['Int']['output']>;
  gold?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  item?: Maybe<Item>;
  itemQuantity?: Maybe<Scalars['Int']['output']>;
  level: Scalars['Int']['output'];
  order: Scalars['Int']['output'];
  silver?: Maybe<Scalars['Int']['output']>;
  skill: Scalars['String']['output'];
};


export type SkillLevelRewardItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type SkillLevelRewardFilter = {
  id?: InputMaybe<Scalars['Int']['input']>;
  level?: InputMaybe<Scalars['Int']['input']>;
  skill?: InputMaybe<Scalars['String']['input']>;
};

export type SkillLevelRewardOrder = {
  id?: InputMaybe<Ordering>;
  level?: InputMaybe<Ordering>;
  order?: InputMaybe<Ordering>;
  skill?: InputMaybe<Ordering>;
};

export type TempleReward = {
  __typename?: 'TempleReward';
  gold?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  inputItem: Item;
  inputQuantity: Scalars['Int']['output'];
  items: Array<TempleRewardItem>;
  minLevelRequired: Scalars['Int']['output'];
  silver?: Maybe<Scalars['Int']['output']>;
};


export type TempleRewardInputItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type TempleRewardItem = {
  __typename?: 'TempleRewardItem';
  id: Scalars['Int']['output'];
  item: Item;
  order: Scalars['Int']['output'];
  quantity: Scalars['Int']['output'];
  templeReward: TempleReward;
};


export type TempleRewardItemItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type TowerReward = {
  __typename?: 'TowerReward';
  gold?: Maybe<Scalars['Int']['output']>;
  item?: Maybe<Item>;
  itemQuantity?: Maybe<Scalars['Int']['output']>;
  level: Scalars['Int']['output'];
  order: Scalars['Int']['output'];
  silver?: Maybe<Scalars['Int']['output']>;
};


export type TowerRewardItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type TowerRewardFilter = {
  level?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
};

export type TowerRewardOrder = {
  level?: InputMaybe<Ordering>;
  order?: InputMaybe<Ordering>;
};

export type Trade = {
  __typename?: 'Trade';
  firstSeen: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  inputItem: Item;
  inputQuantity: Scalars['Int']['output'];
  lastSeen: Scalars['DateTime']['output'];
  oneshot: Scalars['Boolean']['output'];
  outputItem: Item;
  outputQuantity: Scalars['Int']['output'];
};


export type TradeInputItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type TradeOutputItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type TradeOrder = {
  firstSeen?: InputMaybe<Ordering>;
  inputItem?: InputMaybe<ItemOrder>;
  lastSeen?: InputMaybe<Ordering>;
  outputItem?: InputMaybe<ItemOrder>;
};

export type Update = {
  __typename?: 'Update';
  cleanContent: Scalars['String']['output'];
  content: Scalars['String']['output'];
  date: Scalars['Date']['output'];
  textContent: Scalars['String']['output'];
};

export type UpdateFilter = {
  date?: InputMaybe<Scalars['Date']['input']>;
};

export type WishingWellItem = {
  __typename?: 'WishingWellItem';
  chance: Scalars['Float']['output'];
  inputItem: Item;
  outputItem: Item;
};


export type WishingWellItemInputItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type WishingWellItemOutputItemArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
