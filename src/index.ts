import { _ } from 'lodash';
import { LogService } from './services/log.service';


import '@webcomponents/custom-elements/src/native-shim';

import { Tooltip } from './components/tooltip/tooltip';
import { Framework } from './lib/framework';


// write your code here.
const app = new Framework();

app.registerComponent('ao-tooltip', Tooltip);

const logger = new LogService('foo');

logger.debug('fooo');
