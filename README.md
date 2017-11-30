# DeconstructorPlugin 0.1
Item deconstructor plugin for RPG Maker MV

> *Note*: A complete Wiki will be made soon.
Also remember this is my first plugin i've developed since I bought *RPG Maker MV*, which was 5 days ago, neither is a final version and pretty much of the code needs to be optimized and enhanced, hopefully making a 1.0 version, as for road map, wiki will hold all upcoming changes on specific versions. 

## Examples:
+ Destroying potion flask to get Empty Glass Bottle, which could be refilled wit other contents, or get destroyed as well to get shattered glass.
+ Create substance distillers to get some kind of powder for item crafting.
+ Gold nuggets from rivers? :D

*Note*: All tags should be used on Note section on Database

There's two things needed to make it work:
#### Register a material using DeconMaterial tag as it follows
* \<**DeconMaterial**:*MaterialName*>
  Where *MaterialName* should be unique for each material.
  Take in mind MaterialName has nothing to do with Item Name from database.
  
  Example: \<**DeconMaterial**:*EmptyBottle*>
#### Define properties for processable items
* *<**DeconResult** Material:Weight>*

  It will use *Material* to reference to specific material defined on *\<DeconMaterial>* tag, (Weight) will define it's random Weight, when multiple <DeconResult> is defined, higher *Weight* values will have more chances to appear.
  
  To make a chance to drop nothing, (Material) can be **NONE**
* Example:
  - \<**DeconResult** RedFrag:75>
  - \<**DeconResult** BlueFrag:25>
  - \<**DeconResult** NONE:100>

  This will make *RedFrag* three times more common than *BlueFrag* and more chances to get nothing, as doubles the weight from the last two together.
* \<**DeconForced** *Material*:*Drops*>

  It's the same as <DeconResult>, but it ensures a drop by using
  a fixed or random chances, which could start with zero.
  (Drops) could define as folows

  - \<**DeconForced** *EmptyBottle*:*1*> will always drop 1 empty bottle.
  - \<**DeconForced** *Sugar*:*0 to 3*> Will drop Sugar from a random
  number from 0 to 3 exclusive.
  - \<**DeconChanceRepeat**:*Chance*>
  Chance to repeat a process using a decimal number from 0 to 1
  - \<**DeconChanceRepeat**:*0.5*> to ensure half-chance.
  - \<**DeconMaxRepeats**:3>
    Maximum repeated processes.

#### Plugin commands:

* **Deconstructor** *process-item #var*

  Where #var points an item variable to process, it will do nothing if you don't have that item on inventory.
