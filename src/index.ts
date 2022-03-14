import { _ } from 'lodash';
import { LogService } from './services/log.service';


import '@webcomponents/custom-elements/src/native-shim';
import { Framework } from './lib/framework';

import { Counter } from './components/counter/counter';
import { Button } from './components/button/button';
import { Simpleform } from './components/simpleform/simpleform';
import { Modal } from './components/modal/modal';


// write your code here.
const app = new Framework();

app.registerComponent('ao-button', Button);
app.registerComponent('ao-counter', Counter);
app.registerComponent('ao-simpleform', Simpleform);
app.registerComponent('ao-modal', Modal);

const logger = new LogService('foo');

logger.debug('fooo');
