// MIT License
// 
// Copyright (c) 2017 Fabian Matias Greevey
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

/*:
* @plugindesc [V0.1 ] Deconstructs item to materials
* 
* @author <fabian_matias-at-hotmail.com>
* 
* @param Custom Command
* @desc Plugin command
* @default Deconstructor
* 
* @param Text Deconstructing
* @desc Deconstructing result title: %1=Used Item Icon, %2=Used Item Name.
* @default Deconstructing \I[%1]\C[1]%2\C[0]
* 
* @param Text Obtained
* @desc Obtained text for each item: %1=Item Icon, %2=Item Name, %3=Gained quantity
* @default \C[1]+ \C[0]Obtained \I[%1]\C[1]%2\C[0] x \C[1]%3\C[0]
*
* @help
*
* This plugin helps deconstructing Items to Material or any kind of
* sub-items.
* 
* Examples:
*     + Destroying potion flask to get Empty Glass Bottle, which could be
*       refilled wit other contents, or get destroyed as well to get
*       shattered glass.
*     + Create substance distillers to get some kind of powder for
*       item crafting.
*     + Gold nuggets from rivers? :D
* 
* Note: All tags should be used on Note section on Database
* 
* There's two things needed to make it work:
*     1. Register a material using DeconMaterial tag as it follows
*        <DeconMaterial:(MaterialName)>
*          Where (MaterialName) should be unique for each material.
*          Take in mind MaterialName has nothing to do with Item Name
*          from database.
*          Example: <DeconMaterial:EmptyBottle>
*     2. Define properties for processable items
*        <DeconResult (Material):Weight>
*          It will use (Material) to reference to specific material
*          defined on <DeconMaterial> tag, (Weight) will define it's
*          random Weight, when multiple <DeconResult> is defined, higher
*          (Weight) values will have more chances to appear.
*          To make a chance to drop nothing, (Material) can be NONE.
*          Example:
*            <DeconResult RedFrag:75>
*            <DeconResult BlueFrag:25>
*            <DeconResult NONE:100>
*          This will make *RedFrag* three times more common than
*          *BlueFrag* and more chances to get nothing, as doubles
*          the weight from the last two together.
*        <DeconForced (Material):(Drops)>
*          It's the same as <DeconResult>, but it ensures a drop by using
*          a fixed or random chances, which could start with zero.
*          (Drops) could define as folows
*          <DeconForced EmptyBottle:1> will always drop 1 empty bottle.
*          <DeconForced Sugar:0 to 3> Will drop Sugar from a random
*          number from 0 to 3 exclusive.
*        <DeconChanceRepeat:(Chance)>
*          Chance to repeat a process using a decimal number from 0 to 1
*          <DeconChanceRepeat:0.5> to ensure half-chance.
*        <DeconMaxRepeats:3>
*          Maximum repeated processes.
* Plugin commands:
*     'Deconstructor process-item #var'
*         Where #var points an item variable to process.
*         It will do nothing if you don't have that item on inventory.
* 
* Source code is avaiable on:
* https://github.com/fabiosarts/DeconstructorPlugin
*/

(function() {
    var parameters = PluginManager.parameters('Deconstructor');
    var pCommand = String(parameters['Custom Command'] || 'Deconstructor');

    const textDeconstructing = String((parameters['Text Deconstructing']));
    const textObtained = String((parameters['Text Obtained']));

    // Java Object which acts as a dictionary between Material name and Material ID
    // Key: Material Name
    // Value: Database Material ID
    var _materialIndex = {count: 0};
    // Ready flag to avoid re-initializing _materialIndex at bottom
    var _ready = false;

    // Data type for Material drops
    var DeconstructEntry = function(index, value)
    {
        this.materialIndex = index; 
        this.weight = Number(value);
    };

    // Data type for Forced drops
    var DeconstructForcedEntry = function(index, value)
    {
        this.materialIndex = index;
        value = value.split(' to ');
        this.min = Number(value[0]);
        this.max = Number(value[1]);
        this.getNumber = function()
        {
            return isNaN(this.max)? this.min : Math.floor(Math.random() * (this.max - this.min) + this.min);
        }
    };

    // Gets all material entris from Item
    // Inputs:
    //   selectedItem: Target Item Object (not ID)
    //   prefix: Data tag prefix for data extraction
    //   type: Data type which holds the data
    var _getDecontructEntries = function(selectedItem, prefix, type)
    {
        var entries = [];
        for(var key in selectedItem.meta)
        {
            if(!key.startsWith(prefix)) continue;

            var index = _materialIndex[key.split(' ')[1]];
            var value = selectedItem.meta[key];

            entries.push(new type(index, value));
        }

        return entries;
    };

        // Return item ID from DeconstructEntry items array based by their weight
    // Higher weight means higher chances to be selected
    var _getRandomItemByWeight = function(items)
    {
        var totalWeight = 0;
        for(var i = 0; i < items.length; i++)
        {
            totalWeight += items[i].weight;
        }

        var rndValue = Math.random() * totalWeight;

        var result = 0;
        for(var i = 0; i < items.length; i++)
        {
            result += items[i].weight;
            if(rndValue <= result)
            {
                return items[i].materialIndex;
            }
        }
        return items[items.length - 1];
    }

    // Main process which takes an item ID
    var _destroyItem = function(pItemRef) {
        var item = $dataItems[pItemRef];

        // Return if doesn't have the item or invalid
        if(!$gameParty.hasItem(item)) return;
        $gameParty.gainItem(item,-1) //Spend it

        var maxRepeats = Number(item.meta.DeconMaxRepeats) + 1 || 1;
        
        $gameMessage.add(textDeconstructing.format(item.iconIndex, item.name));

        // Makes a list of item drops for <DeconResult Material:Weight>
        // TODO: Check if DeconResult and DeconForced is properly formated
        var deconstructEntries =  _getDecontructEntries(item, 'DeconResult', DeconstructEntry);
        var newItems = {};
        for(var i = 0;i < maxRepeats + 1; i++)
        {
            var randomItem = _getRandomItemByWeight(deconstructEntries);
            if(!randomItem) continue;
            
            newItems[randomItem] = newItems[randomItem]? newItems[randomItem] + 1 : 1;

            if(Math.random() > (Number(item.meta.DeconChanceRepeat) || 0))
            {
                break;
            }
        }

        // Iterates the list of item drops and add to inventory/displays them on message
        for(var key in newItems)
        {
            var quantity = newItems[key]; 
            var itemRef = $dataItems[key];
            $gameParty.gainItem(itemRef, quantity);
            $gameMessage.add(textObtained.format(itemRef.iconIndex, itemRef.name, quantity));
        }

        // Process forced <DeconForced Material:Quantity> and adds to inventory/displays them on message
        var forcedResults = _getDecontructEntries(item, 'DeconForced', DeconstructForcedEntry);
        for(var i = 0; i < forcedResults.length; i++)
        {
            var quantity = forcedResults[i].getNumber();
            var itemRef = $dataItems[forcedResults[i].materialIndex];

            if(quantity === 0) continue;

            $gameParty.gainItem(itemRef, quantity);
            $gameMessage.add(textObtained.format(itemRef.iconIndex, itemRef.name, quantity));
        }
    };

    // Initialization function which runs from from Title Scene
    var _initialize = function()
    {
        for(var i = 1; i < $dataItems.length ; i++)
        {
            var data = $dataItems[i].meta.DeconMaterial;

            // Return if has no data
            if(!data) continue;
            
            if(!_materialIndex[data])
            {
                // Not found, registering.
                _materialIndex[data] = i;
                _materialIndex.count++;
            }
            else
            {
                // This material has been registerd, triggering error displaying conflicts
                throw new Error(('Deconstructor: Material %1 is duplicated from %2 to %3').format(data, _materialIndex[data], i));
            }
        }
    };

    // Plugin command processing
    var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {

        if(command !== pCommand) return;

        switch(args[0])
        {
            case 'process-item':
            {
                //TODO: Make prefix 'v' for variable number, else as literal.
                _destroyItem($gameVariables.value(args[1]));
                break;
            }
        }
    };

    // Title scene is used to initialize the Material Dictionary
    var _ov_Scene_title = Scene_Title.prototype.initialize;
    Scene_Title.prototype.initialize = function() {
        _ov_Scene_title.call(this);
        if(!_ready)
        {
            _initialize();
            console.log(("Deconstructor is initialized with %1 items.").format(_materialIndex.count));
            _ready = true;
        }
    };
})();