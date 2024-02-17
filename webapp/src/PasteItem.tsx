import {
  Box,
  Flex,
  Icon,
  IconButton,
  Text,
  useClipboard,
} from "@chakra-ui/react";
import { MdContentCopy } from "react-icons/md";
import { StreamEvent } from "./model";
import { BsClipboardCheck } from "react-icons/bs";

type Props = {
  paste: StreamEvent;
};

function PasteItem({ paste }: Readonly<Props>) {
  const { onCopy, hasCopied } = useClipboard(paste.Payload);

  return (
    <Box
      position="relative"
      py={6}
      px={8}
      my={3}
      borderRadius="24px"
      bg="white"
      _dark={{
        bg: "gray.800",
      }}
    >
      <Text fontSize="xs" color="gray.500" _dark={{ color: "gray.400" }}>
        {new Date(paste.Timestamp * 1000).toLocaleString()}
      </Text>

      <Text pt={2} fontSize="sm">
        {paste.Payload}
      </Text>

      <Flex position="absolute" top={1} right={4} gap={4}>
        <IconButton
          size="md"
          aria-label="copy"
          variant="ghost"
          colorScheme={hasCopied ? "green" : "brand"}
          onClick={onCopy}
          icon={
            <Icon
              as={hasCopied ? BsClipboardCheck : MdContentCopy}
              boxSize={6}
            />
          }
        />
      </Flex>
    </Box>
  );
}

export default PasteItem;
