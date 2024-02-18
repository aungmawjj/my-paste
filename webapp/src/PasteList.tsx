import { Box, Show, Icon, IconButton } from "@chakra-ui/react";
import { MdAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import useStreamEvents from "./useStreamEvents";
import PasteItem from "./PasteItem";

function PasteList() {
  const { streamEvents } = useStreamEvents();
  const navigate = useNavigate();

  return (
    <>
      <Show below="md">
        <IconButton
          position="fixed"
          bottom={6}
          right={6}
          zIndex={2}
          aria-label="Add"
          colorScheme="brand"
          width="72px"
          height="72px"
          borderRadius="16px"
          boxShadow="xl"
          icon={<Icon as={MdAdd} boxSize={8} />}
          onClick={() => navigate("/add-paste")}
        />
      </Show>

      <Box pb={20} data-testid="paste-list">
        {streamEvents.map((e) => (
          <PasteItem paste={e} key={e.Id} />
        ))}
      </Box>
    </>
  );
}

export default PasteList;
