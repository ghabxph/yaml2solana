"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.utilUi = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const CHOICE_GENERATE_PDA = 'Generate PDA';
const CHOICE_ANALYZE_TRANSACTION = 'Analyze Transaction';
function utilUi() {
    return __awaiter(this, void 0, void 0, function* () {
        const { choice } = yield inquirer_1.default
            .prompt([
            {
                type: 'list',
                name: 'choice',
                message: '-=[Utility/Debugging Tools UI]=-\n\n [Choose Action]',
                choices: [
                    CHOICE_GENERATE_PDA,
                    CHOICE_ANALYZE_TRANSACTION,
                ],
            },
        ]);
        if (choice === CHOICE_GENERATE_PDA) {
            yield inquirer_1.default
                .prompt([
                {
                    type: 'input',
                    name: 'programId',
                    message: 'Program ID:'
                }
            ]);
            const { choice } = yield inquirer_1.default
                .prompt([
                {
                    type: 'list',
                    name: 'choice',
                    message: 'Do you wish to add more seeds?',
                    choices: ['yes', 'no']
                }
            ]);
        }
    });
}
exports.utilUi = utilUi;
