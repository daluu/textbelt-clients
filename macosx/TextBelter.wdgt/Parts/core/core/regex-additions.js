/** A function to escape strings for creating regular expressions.
 */
RegExp.escape = function(text)
{
  return text.replace(RegExp._escapeRegex, '\\$1');
}
RegExp.specialCharacters= ['/', '.', '*', '+', '?', '|',
                           '(', ')', '[', ']', '{', '}', '\\'];
RegExp._escapeRegex= new RegExp('(\\'+ RegExp.specialCharacters.join("|\\") +
                                ')', 'g');
